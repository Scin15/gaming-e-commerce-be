import express, { urlencoded } from 'express'
import { 
  insertProduct,
  readProducts,
  insertOrder,
  updateUser,
  readOrder} from './controllers/app.controller.js';
import { 
  registerUser, 
  loginUser, 
  logoutUser, 
  protectedRoute, 
  refreshToken,
  activateAccount } from './controllers/app.autentication.js'
import 'dotenv/config' // libreria dotenv per usare le variabili di ambiente con process.env.<variabile>
import cookieParser from 'cookie-parser' // libreria per la gestione di cookie
import cors from 'cors' // libreria per la gestione del Cross-origin resource sharing: https://en.wikipedia.org/wiki/Cross-origin_resource_sharing
// import { isAuth } from './controllers/isAuth.js'
import mongoose from 'mongoose';
import { Product } from './schema/product.schema.js';
import { User } from './schema/user.schema.js'; 

mongoose.connect(`mongodb+srv://${process.env.DB_ADMIN}:${process.env.DB_ADMIN_PASSWORD}@gaming-e-commerce-db.p4wd4wx.mongodb.net/?appName=gaming-e-commerce-db`)
  .then(() => {
    console.log("Connesso al DB");
  })
  .catch(() => {
    console.log("Errore nella connessione al DB");
  })

const app = express()

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded());
app.use(cors({
  origin : ["http://localhost:5173", "https://app-spese-fe.onrender.com"],
  credentials : true
}));


app.get('/user/all', async (req, res) => {
  // query al db
  try {
    const result = await User.find();
    console.log("Utenti trovati: ", result);
    res.status(200).send(result);
  } catch(err) {
    res.status(500).send(err);
  }
})

app.delete("/product/all", async(req, res) => {
  try{
    const result = await Product.deleteMany();
    res.status(200).send(result);
  } catch(err) {
    res.status(500).send(err);
  }
})

app.delete("/user/all", async(req, res) => {
  try {
    const result = await User.deleteMany();
    res.status(200).send({message: "Tutti gli utenti eliminati con successo"});
  } catch (err) {
    res.status(500).send({error: err.message});
  }
})

// registrazione utente
app.post('/register', registerUser);
// login utente
app.post('/login', loginUser);
// logour utente
app.post('/logout', logoutUser);
// attivazione account con url inviato per email dopo la registrazione
app.get("/activate", activateAccount);
// // refresh del token di accesso
// app.post('/refresh_token', refreshToken)


// CRUD
app.get("/product", readProducts);

// middleware per la verifica del JWT accessToken. Se è verificato aggiunge alla richiesta una proprietà userAuth valorizzato con user id
app.use(protectedRoute);

app.post('/product', insertProduct);
app.post("/order", insertOrder);
app.put("/user", updateUser);
app.get("/order", readOrder);

// avvio server
app.listen(process.env.PORT, () => {
  console.log(`Example app listening on port ${process.env.PORT}`)
})

