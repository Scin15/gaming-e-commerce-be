import 'dotenv/config'
import pkg from 'jsonwebtoken'
const { sign } = pkg

// create le funzioni per la generazione del token per l'accesso e il refresh

const generateAccessToken = ( userId ) => {
    return sign( { userId }, process.env.ACCESS_TOKEN_SECRET, { expiresIn : '15m' }  )
}

const generateRefreshToken = ( userId ) => {
    return sign( { userId }, process.env.REFRESH_TOKEN_SECRET, { expiresIn : '7d' }  )
}

const sendAccessToken = (req, res, accessToken, user) => {
    const { id, name, surname, mail } = user;
    res.send({ 
        accessToken,
        mail,
        id,
        name,
        surname
     })
    }
    
    const sendRefreshToken = (req, res, refreshToken) => {
        res.cookie('refreshToken', refreshToken, {
            httpOnly : true,
            path : '/refresh_token',
            sameSite: 'none',
            secure: true
        })
}

export { 
    generateAccessToken,
    generateRefreshToken,
    sendAccessToken,
    sendRefreshToken
 }
