import pkg from 'jsonwebtoken' // libreria per la gestione di JSON Web token
const { verify } = pkg

// funzione per verificare che il token nell'header della richiesta sia valido
const isAuth = ( req, res ) => {
    const authorization = req.headers['authorization'];

    if ( !authorization ) {
        return;
    }

    const token = authorization.split(" ")[1];
    const { userId }  = verify( token, process.env.ACCESS_TOKEN_SECRET );
    if (!userId) {
        return;
    }
    return userId;
}

export { isAuth }