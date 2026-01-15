import { PrismaClient } from './generated/prisma/index.js'
import { withAccelerate } from '@prisma/extension-accelerate'
import express from 'express'
import { 
  insertExpense, 
  readExpense, 
  readUserExpense, 
  readCategory, 
  updateExpense,
  updateBudget, 
  deleteExpense, 
  deleteExpenseAll,
  readUserKpi,
  readUserStats } from './controllers/app.controller.js'
import { 
  registerUser, 
  loginUser, 
  logoutUser, 
  protectedRoute, 
  refreshToken } from './controllers/app.autentication.js'
import 'dotenv/config' // libreria dotenv per usare le variabili di ambiente con process.env.<variabile>
import cookieParser from 'cookie-parser' // libreria per la gestione di cookie
import cors from 'cors' // libreria per la gestione del Cross-origin resource sharing: https://en.wikipedia.org/wiki/Cross-origin_resource_sharing
import { isAuth } from './controllers/isAuth.js'

const app = express()

app.use(express.json())
app.use(cookieParser())
app.use(cors({
  origin : ["http://localhost:5173", "https://app-spese-fe.onrender.com"],
  credentials : true
}))

const prisma = new PrismaClient().$extends(withAccelerate())

// registrazione utente
app.post('/register', registerUser)
// login utente
app.post('/login', loginUser)
// logour utente
app.post('/logout', logoutUser)
// percorso protetto da accesso
app.get('/protected', protectedRoute)
// refresh del token di accesso
app.post('/refresh_token', refreshToken)

// middleware per la verifica del JWT accessToken. Se è verificato aggiunge alla richiesta una proprietà userAuth valorizzato con user id
app.use(protectedRoute)

// CRUD
app.get('/allExpenses', readExpense)
app.get('/expenses', readUserExpense)
app.get('/expenses/kpi/', readUserKpi)
app.get('/expenses/stats/', readUserStats)
app.get('/category', readCategory)
app.post('/expenses', insertExpense)
app.put('/expenses', updateExpense)
app.delete('/expenses', deleteExpense)
app.delete('/expenses/all', deleteExpenseAll)
app.put('/budget', updateBudget)

// avvio server
app.listen(process.env.PORT, () => {
  console.log(`Example app listening on port ${process.env.PORT}`)
})

