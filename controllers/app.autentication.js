import 'dotenv/config'; 
import { hash, compare } from 'bcryptjs'; // libreria per la codifica hash delle password
import {
    generateAccessToken,
    generateRefreshToken,
    sendAccessToken,
    sendRefreshToken
} from './token.js';
import { isAuth } from './isAuth.js';
import * as jwt from 'jsonwebtoken';
import { User } from '../schema/user.schema.js';
import nodemailer from "nodemailer";
const {verify} = jwt.default;

const trasporter = nodemailer.createTransport({
    // host: 'smtp.gmail.com',
    // port: 465,
    service: "gmail",
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.GOOGLE_MAIL_PASSWORD,
        // type: "OAuth2",
        // user: process.env.EMAIL_USER,
        // clientId: process.env.GOOGLE_CLIENT_ID,
        // clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        // refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
        // accessToken: process.env.GOOGLE_ACCESS_TOKEN,
    }
});

const sendActivationMail = async (email, token) => {
    try {
        console.log(`${process.env.HOST_FULL}/activate/?email=`+ email + "&token=" + token);
        await trasporter.sendMail({
            from: "e.commerce.app",
            to: email,
            subject: "Link attivazione account",
            text: "Usa il link sottostante per attivare il tuo account :)",
            html: `<a href='${process.env.HOST_FULL}/activate/?email=`+ email + "&token=" + token + "'>Link di attivazione</a>"
        });
    } catch (err) {
        console.log(`Errore nell'invio mail a ${email}, error: ${err.message} other info: ${err.code, err.command, err.response, err.responseCode}`);

        // res.status(500).send({error: err.message});
    }
}

export {sendActivationMail};

const activateAccount = async (req, res) => {
    const activationToken = req.query.token;
    const email = req.query.email;
    try {
        const user = await User.findOne({email: email});
        if (!user || user instanceof Array && user.length === 0) {
            res.status(404).send({error: "Utente non registrato"});
            return;
        }
        if (user.active) {
            res.status(400).send({error: "Utente già attivato"});
            return;
        }
        if (user.activation_token != activationToken) {
            res.status(400).send("Attivazione non riuscita");
            return;
        }
        user.activation_token = "";
        user.active = true;
        await user.save();
        res.status(200).send({message: "Account attivato con successo"});
    } catch (err) {
        res.status(400).send({error: "Attivazione non riuscita"});
    }
}

const registerUser = async (req, res) => {
    
    try {
        const email = req.body.email;
        const name = req.body.name;
        const surname = req.body.surname;
        const password = req.body.password;
        const role = req.body.role;
        
        if ( !email || !password || !role ) { 
            res.status(400).send({error: "Mancano dati"});
            return;
        }
        
        if ( !email.match(/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/) ) { 
            res.status(400).send({error: "Email non valida"});
            return;
        }
        
        // constrollo se l'utente è già presente nel DB
        const alreadyRegistered = await User.find({ email: email});
        // se già presenete nel DB mando una risposta di errore;
        if (alreadyRegistered.length > 0) {
            res.status(400).send({error: "Utente già registrato"});
            return;
        }
        
        // se non presente nel DB codifico la password e aggiungo l'utente
        const hashedPassword = await hash( password, 10);
        const currentDate = Date.now();
        // genero token per attivazione account tramite mail
        const activationToken = generateAccessToken( email );
        // da spostare sopra e non registrare se c'è stato un errore nell'invio mail
        try { // catch inutile
            sendActivationMail(email, activationToken);
        } catch (error) {
            console.log("errore nell'invio mail", error.message);
            // throw new Error(`errore nell'invio mail, ${error.message}`);
        }
        const insertUser = await User.create({
            email: email,
            name : name,
            surname : surname,
            password : hashedPassword,
            role : role,
            active: false,
            activation_token: activationToken,
            created_at : currentDate
        });
        
        if (!insertUser) {
            res.status(500).send({error: "Errore nell'inserimento nuova utenza"});
            return;
        }

        res.status(200).send(insertUser);
        
    } catch(error) {
        res.status(500).send({error : `${error.message}`});
    }
}

const loginUser = async (req, res) => {

    try {
    // nel body viene passata mail e password
    const email = req.body.email;
    const password = req.body.password;

    if ( !email || !password ) {
        res.status(400).send({error: "Email o password mancanti"});
        return;
    }

    const user = await User.findOne({ email : email });

    if (!user || user instanceof Array && user.length === 0) {
        res.status(400).send({error: "Utente non registrato"});
        return;
    }
    
    if (!user.active) {
        res.status(400).send({error: "Utenza non attivata, controlla la mail"});
        return;
    }

    let userVerificated = null;

    try{
        userVerificated = await compare( password, user.password );
    } catch(err) {
        throw new Error(err);
    }

    if ( !userVerificated ) {
        res.status(401).send({error: "Password errata"});
        return;
    }
    // creazione ed invio jwtoken (JSON Web token)
    const accessToken = generateAccessToken( user._id );
    // inserimento refresh_token nel DB

    // invio del token di autenticazione e di refresh
    sendAccessToken( req, res, accessToken, user );

    } catch(error) {
        res.status(500).send({
            error : `${error.message}`
        })
    }
}

const logoutUser = async ( req, res ) => {
    console.log("arrivato al logout");
    res.clearCookie('refreshToken', { path : '/refresh_token' });
    res.status(200).send("Logged out");
}

// diventa il middleware per ogni richiesta protetta (ogni richiesa di CRUD relativa all'utente)
const protectedRoute = async ( req, res, next ) => {
    try {
        const userId = isAuth(req, res) // ritorna l'userId
    if ( !userId ) {
        res.status(403).send({error: "Non autorizzato"});
        return;
    }
    
    req.userAuth = userId;
    next();

    } catch(error) {
        res.status(404).send({error:`Errore nell'accesso alla risorsa: ${error}`});
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
    activateAccount,
}

