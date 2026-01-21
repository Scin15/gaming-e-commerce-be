import express, { urlencoded } from 'express'
// import { 
//   insertExpense, 
//   readExpense, 
//   readUserExpense, 
//   readCategory, 
//   updateExpense,
//   updateBudget, 
//   deleteExpense, 
//   deleteExpenseAll,
//   readUserKpi,
//   readUserStats } from './controllers/app.controller.js'
import { 
  insertProduct,
  readAllProducts} from './controllers/app.controller.js';
import { 
  registerUser, 
  loginUser, 
  logoutUser, 
  protectedRoute, 
  refreshToken } from './controllers/app.autentication.js'
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


app.get('/test', async (req, res) => {
  // query al db
  try {
    const result = await Product.find();
    console.log("Dati trovati: ", result);
    res.status(200).send(result);
  } catch(err) {
    res.status(500).send(err);
  }
})

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

app.post("/user", async (req, res) => {
  try {
    const result = await User.create(req.body);
    console.log("Utente inserito: ", result);
    res.status(200).send(result);
  } catch(err) {
    console.log(err);
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

// registrazione utente
app.post('/register', registerUser);
// login utente
app.post('/login', loginUser);
// logour utente
app.post('/logout', logoutUser);
// // percorso protetto da accesso
// app.get('/protected', protectedRoute)
// // refresh del token di accesso
// app.post('/refresh_token', refreshToken)

// middleware per la verifica del JWT accessToken. Se è verificato aggiunge alla richiesta una proprietà userAuth valorizzato con user id
// app.use(protectedRoute)

// CRUD
app.post('/product', insertProduct);
app.get("/product", readAllProducts);

// avvio server
app.listen(process.env.PORT, () => {
  console.log(`Example app listening on port ${process.env.PORT}`)
})

