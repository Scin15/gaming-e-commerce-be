import bcrypt from 'bcryptjs' // libreria per hash della password
import cookieParser from 'cookie-parser' // libreria per la getione dei cookie
import { Product } from '../schema/product.schema.js';
const saltRounds = 10

// funzione per la creazione nuovo record
const insertProduct = async (req, res) => {
  try {
    // validazione prodotto
    // validazione tag che sia di 3 caratteri e non di più
    // validazione che url sia valido?

    // costruzione del payload da inserire nel db
    let payload = req.body;

    if (payload.platform_tag.length != 3) {
      res.status(400).send("Platform Tag length < 3");
      return;
    }
    if (payload.category_tag.length != 3) {
      res.status(400).send("Category Tag length < 3");
      return;
    }

    const payloadElaborated = {
      title: payload.title,
      platform: {tag: payload.platform_tag, name: payload.platform},
      price: Number(payload.price),
      desc: payload.desc,
      img_cover: payload.img_cover,
      img_misc: payload.img_misc,
      category: {tag: payload.category_tag, name: payload.category}
    };

    console.log("Payload rielaborato:", payloadElaborated);

    payloadElaborated.created_at = Date.now();
    console.log("Payload:", payloadElaborated);
    const result = await Product.create(payloadElaborated);
    console.log("Prodotto inserito: ", result);
    res.status(200).send(result);
  } catch(err) {
    console.log(err);
    res.status(500).send(err);
  }
}

// se non mando una query string con il titolo, ritorna tutto il catalogo prodotti
const readAllProducts = async (req, res) => {
  try {
    const title = req.query.title;
    console.log("Richiesta: ", title);
    const result = await Product.find(
      title ? { title: title } : {});
    res.status(200).send(result);
  } catch(err) {
    res.status(500).send(err);
  }
}

// funzione per la lettura di tutte le spese
const readExpense = async (req, res) => {
  try{
    const expense = await prisma.expense.findMany()
    res.status(200).send(expense)
  } catch(error) {
    res.status(500).send(`Errore nella lettura spese : ${error}`)
  }  
}

// funzione per la lettura delle spese di un utente
const readUserExpense = async (req, res) => {
  try{
    console.log(req.params.id)
    console.log("User nella richiesta arrivata dal middleware:", req.userAuth)
    const expense = await prisma.expense.findMany({
      where: {
        userid: {
          equals: req.userAuth
        }
      },
      include: {
        category: {
          select: {
            category: true
          }
        }
      },
    })
    res.status(200).send(expense)
  } catch(error) {
    res.status(500).send(`Errore nella lettura spese : ${error}`)
  }  
}

// funzione per la lettura delle categorie
const readCategory = async (req, res) => {
  try{
    const category = await prisma.category.findMany()
    res.status(200).send(category)
  } catch(error) {
    res.status(500).send(`Errore nella lettura spese : ${error}`)
  }  
}

// funzione per l'update di una spesa
const updateExpense = async (req, res) => {
  const currentExpense = req.body
  const currentDate = new Date().toJSON()
  try{
    const expense = await prisma.expense.update({
      where : {
        id : currentExpense.id,
        userid: req.userAuth
      },
      data : {
        category_id : currentExpense.category_id,
        date_update : currentDate,
        amount : currentExpense.amount,
        note : currentExpense.note,
        date: new Date(currentExpense.date).toJSON()
      }
    })
    res.status(200).send(expense)
  } catch(error)
  {
    res.status(500).send(`Errore nell'update della spesa: ${error}`)
  }
}

// funzione per l'update del budget utente
const updateBudget = async (req, res) => {
  const currentDate = new Date().toJSON()
  const budget = (new Number(req.body.budget)).valueOf()
  try{
    const userSettings = await prisma.user_settings.updateMany({
      where : {
        userid: {
          equals: req.userAuth
        }
      },
      data : {
        date_update : currentDate,
        budget : budget,
      }
    })
    res.status(200).send(userSettings)
  } catch(error)
  {
    res.status(500).send(`Errore nell'update dell budget: ${error}`)
  }
}

// funzione per l'eliminazione di una spesa
const deleteExpense = async (req, res) => {
  const currentExpense = req.body
  try{
    const expense = await prisma.expense.delete({
      where : {
        id : currentExpense.id,
        userid: req.userAuth
      }
    })
    res.status(200).send(expense)
  } catch(error){
    res.status(500).send(`Errore nell'eliminazione della spesa : ${error}`)
  }
}

// funzione per l'eliminazione di una spesa
const deleteExpenseAll = async (req, res) => {
  try{
    const expense = await prisma.expense.deleteMany()
    res.status(200).send(expense)
  } catch(error){
    res.status(500).send(`Errore nell'eliminazione di tutte le spese : ${error}`)
  }
}

const readUserKpi = async (req, res) => {
  try{
    console.log("Utente per la lettura dei kpi: ", req.userAuth)
    // cerco il totale delle spes per l'utente
    const { _sum } = await prisma.expense.aggregate({
      _sum : {
        amount: true
      },
      where: {
        userid: {
          equals: req.userAuth
        }
      }
    })

    // cerco la categoria in cui l'utente ha speso di più
    const maxCategory = await prisma.expense.groupBy({
      by: ["category_id"],
      where: {
        userid: {
          equals: req.userAuth
        }
      },
      _sum : {
        amount: true
      },
    })

    maxCategory.sort((a ,b) => b._sum.amount - a._sum.amount)

    // cerco il nome della categoria con l'id trovato

    const maxCategoryDesc = await prisma.category.findFirst({
      where: {
        id: {
          equals: maxCategory.length > 0 ? maxCategory[0].category_id : -1
        }
      },
      select: {
        category: true
      }
    })

    //cerco il budget dell'utente

    const budget = await prisma.user_settings.findFirst({
      where: {
        userid: {
          equals: req.userAuth
        }
      },
      select: {
        budget: true
      }
    })

    res.status(200).send({
      total: _sum.amount ? _sum.amount : 0, 
      maxCategory: {
        id: maxCategory.length > 0 ? maxCategory[0].category_id : -1, 
        desc: maxCategoryDesc ? maxCategoryDesc.category : "", 
        amount: maxCategory.length > 0 ? maxCategory[0]._sum.amount : 0 
      },
      budget: budget.budget 
    })

  } catch(error) {
    res.status(500).send(`Errore nella lettura dei Kpi utente: ${error}`)
  }
}

const readUserStats = async (req, res) => {
  try{

    // leggo l'ammontare per categoria usando una query sql perchè Prisma non implementa l'inclusione dei campi con relazione (category nella taballa category) quando uso il metodo prisma.table.groupBy
    const categoryAmount = await prisma.$queryRaw`
    SELECT a.category_id,
      b.category,
      SUM(a.amount) as amount
    FROM 
      expense a
    INNER JOIN 
      category b 
    ON 
      a.category_id = b.id
    WHERE 
      a.userid = ${req.userAuth}
    GROUP BY 
      a.category_id,
      b.category
    `

    // leggo l'ammontare per mese
    const monthlyAmount = await prisma.$queryRaw`
      SELECT to_char(date, 'YYYY-MM') as yearMonth,
        SUM(amount) as amount
      FROM expense
      WHERE 
        userid = ${req.userAuth}
      GROUP BY
        yearMonth`

  res.status(200).send({categoryAmount, monthlyAmount})
    
  } catch(error) {
    res.status(500).send(`Errore nella lettura delle statistiche utente: ${error}`)
  }
}

// export delle funzioni per CRUD API
export { 
  insertProduct,
  readAllProducts,
}
