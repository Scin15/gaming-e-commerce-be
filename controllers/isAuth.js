import pkg from 'jsonwebtoken' // libreria per la gestione di JSON Web token
const { verify } = pkg

// funzione per verificare che il token nell'header della richiesta sia valido
const isAuth = ( req, res ) => {
    const authorization = req.headers['authorization']
    console.log(authorization)
    if ( !authorization ) {
        throw ('You need to login')
    }
    const token = authorization.split(" ")[1]
    console.log(typeof(token))
    const { userId }  = verify( token, process.env.ACCESS_TOKEN_SECRET )
    console.log(userId)
    return userId
}

export { isAuth }