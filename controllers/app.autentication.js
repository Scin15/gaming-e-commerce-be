import 'dotenv/config' 
import { hash, compare } from 'bcryptjs' // libreria per la codifica hash delle password
import {
    generateAccessToken,
    generateRefreshToken,
    sendAccessToken,
    sendRefreshToken
} from './token.js'
import { isAuth } from './isAuth.js'
import * as jwt from 'jsonwebtoken';
import { User } from '../schema/user.schema.js';
const {verify} = jwt.default
// const prisma = new PrismaClient().$extends(withAccelerate())

const registerUser = async (req, res) => {

    try {
        const email = req.body.email;
        const name = req.body.name;
        const surname = req.body.surname;
        const password = req.body.password;
        const role = req.body.role;
    
        if ( !email || !password || !role ) { 
            throw new Error("Mancano dati")
        }
        
        if ( !email.match(/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/) ) { 
            throw new Error("Email non valida")
        }

        // constrollo se l'utente è già presente nel DB
        const alreadyRegistered = await User.find({ email: email});
        console.log("Check se utente gia registrato:", alreadyRegistered);
        // se già presenete nel DB lancio un errore
        if ( alreadyRegistered.length > 0 ) {

            throw new Error("Utente già registrato")
        }
        
        // se non presente nel DB codifico la password e aggiungo l'utente
        const hashedPassword = await hash( password, 10);
        const currentDate = Date.now();
        try{
            var insertUser = await User.create({
                    email: email,
                    name : name,
                    surname : surname,
                    password : hashedPassword,
                    role : role,
                    created_at : currentDate
            })
        } catch(err) {
            throw new Error("Errore nell'inserimento nuova utenza");
        }
    

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
    console.log("arrivata una richiesta login");
    const email = req.body.email;
    const password = req.body.password;

    if ( !email || !password ) {
        throw new Error("Mail o password mancanti")
    }

    const result = await User.find({
            email : email
    });

    const user = result[0];

    if ( !user || user.length == 0 ) {
        throw new Error("Utente non registrato");
    }

    console.log("Utente trovato:", user);

    try{
        var userVerificated = await compare( password, user.password )
    }catch(err) {
        console.log("Errore nel confronto password")
        throw new Error(err);
    }
    if ( !userVerificated ) {
        throw new Error("Password errata");
    }
    // creazione ed invio jwtoken (JSON Web token)
    const accessToken = generateAccessToken( user._id );
    const refreshToken = generateRefreshToken( user._id );
    // inserimento refresh_token nel DB
    await User.updateOne( {
                _id : user._id
            },
            {
                refresh_token: refreshToken
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

//     awai    t prism_idapp_user_s.
//         },update({
//         {
//                 refresh_token : newRefreshToken
//         where : {
//             id : user.id
//         }
//     })

//     // invio nuovi token di accesso e refresh nella risposta
//     sendRefreshToken(req, res, newRefreshToken)
//     sendAccessToken(req, res,newAccessToken, user)
}

export {
    registerUser, 
    loginUser, 
    logoutUser,
    protectedRoute,
    refreshToken,
}

