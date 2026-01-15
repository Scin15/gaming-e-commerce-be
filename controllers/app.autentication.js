import 'dotenv/config' 
import { hash, compare } from 'bcryptjs' // libreria per la codifica hash delle password
import { PrismaClient } from '../generated/prisma/index.js'
import { withAccelerate } from '@prisma/extension-accelerate'
import {
    generateAccessToken,
    generateRefreshToken,
    sendAccessToken,
    sendRefreshToken
} from './token.js'
import { isAuth } from './isAuth.js'
import * as jwt from 'jsonwebtoken'
const {verify} = jwt.default
const prisma = new PrismaClient().$extends(withAccelerate())

const registerUser = async (req, res) => {

    try {
        const mail = req.body.mail
        const name = req.body.name
        const surname = req.body.surname
        const password = req.body.password
        const role = req.body.role
    
        if ( !mail || !name || !surname || !password ) { 
            throw new Error("Mancano dati")
        }
        
        if ( !mail.match(/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/) ) { 
            throw new Error("Email non valida")
        }

        // constrollo se l'utente è già presente nel DB
        const alreadyRegistered = await prisma.app_users.findFirst({
            where : {
                mail : mail
            }
        })
        // se già presenete nel DB lancio un errore
        if ( alreadyRegistered ) {
            throw new Error("Utente già registrato")
        }
        
        // se non presente nel DB codifico la password e aggiungo l'utente
        const hashedPassword = await hash( password, 10)
        const currentDate = new Date().toJSON()
        const insertUser = await prisma.app_users.create({
            data : {
                mail: mail,
                name : name,
                surname : surname,
                password : hashedPassword,
                role : role,
                date_create : currentDate
            }
        })
    
        // inserisco record per i settings dell'utente con valori default
        await prisma.user_settings.create({
            data: {
                userid: insertUser.id,
                date_update: currentDate,
                budget: 1000
            }
        })

        res.status(200).send(insertUser)
    } catch(error) {
        res.status(500).send({
            error : `${error.message}`
        }
        )
    }
}

const loginUser = async (req, res) => {

    try {
    // nel body viene passata mail e password
    console.log("arrivata una richiesta login")
    const mail = req.body.mail
    const password = req.body.password

    if ( !mail || !password ) {
        throw new Error("Mail o password mancanti")
    }
    const user = await prisma.app_users.findFirst({
        where : {
            mail : mail
        }
    })
    if ( !user ) {
        throw new Error("Utente non registrato")
    }

    const userVerificated = await compare( password, user.password )
    if ( !userVerificated ) {
        throw new Error("Password errata")
    }
    // creazione ed invio jwtoken (JSON Web token)
    const accessToken = generateAccessToken( user.id )
    const refreshToken = generateRefreshToken( user.id )
    // inserimento refresh_token nel DB
    await prisma.app_users.update( {
        where : {
            id : user.id
        },
        data : {
            refresh_token: refreshToken
        }
    } )

    // invio del token di autenticazione e di refresh
    sendRefreshToken( req, res, refreshToken )
    sendAccessToken( req, res, accessToken, user )

    } catch(error) {
        res.status(500).send({
            error : `${error.message}`
        })
    }
}

const logoutUser = async ( req, res ) => {
    console.log("arrivato al logout")
    res.clearCookie('refreshToken', { path : '/refresh_token' })
    res.status(200).send("Logged out")
}

// diventa il middleware per ogni richiesta protetta (ogni richiesa di CRUD relativa all'utente)
const protectedRoute = async ( req, res, next ) => {
    try {
        //console.log(req.headers)
        const userId = isAuth(req) // ritorna l'userId
    if ( !userId ) {
      throw new Error("You need to login")
    }
    
    console.log("Utente auth:", userId)
    req.userAuth = userId
    next()

    } catch(error) {
        res.status(500).send(`Errore nell'accesso alla risorsa: ${error}`)
    }
}

const refreshToken = async (req, res) => {
    console.log(`Cookies nella richiesta : `, req.headers)
    const refreshToken = req.cookies.refreshToken

    if (!refreshToken) {
        return res.send({accessToken : '' })
    }
    
    let payload = null
    try {
        payload = verify(refreshToken,  process.env.REFRESH_TOKEN_SECRET)
    } catch(error) {
        return res.send({accessToken : `Non verificato: ${error}`})
    }
    console.log(payload.userId)
    // cerco se è presente il record corrispondente all'userID dato dal token
    const user = await prisma.app_users.findUnique({
        where : {
            id : payload.userId
        }
    })
    console.log(user)
    // se user non è presente ritorno un token vuoto
    if(!user) {
        return (res.send({accessToken : ''}))
    }
    // se il token non corrisponde ritorno un token vuoto
    if (user.refresh_token != refreshToken) {
        return (res.send({accessToken : ''}))
    }
    //se ho trovato l'utente e il refresh_token corrisponde a quello nel DB, genero e invio una nuova coppia
    const newAccessToken = generateAccessToken(user.id)
    const newRefreshToken = generateRefreshToken(user.id)

    // inserimento del nuovo refresh token nel DB

    await prisma.app_users.update({
        data : {
            refresh_token : newRefreshToken
        },
        where : {
            id : user.id
        }
    })

    // invio nuovi token di accesso e refresh nella risposta
    sendRefreshToken(req, res, newRefreshToken)
    sendAccessToken(req, res,newAccessToken, user)
}

export {
    registerUser, 
    loginUser, 
    logoutUser,
    protectedRoute,
    refreshToken,
}

