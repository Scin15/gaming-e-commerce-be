import { Product } from '../schema/product.schema.js';
import { User } from '../schema/user.schema.js';

const insertProduct = async (req, res) => {

  const userAuth = req.userAuth;

  try {

    const user = await User.findById(userAuth);
    if (!user) {
      res.status(404).send({error: "Utente non trovato"});
    }
    if (user.role !== "admin") {
      res.status(403).send({error: "Autorizzazione negata"});
    }

    // costruzione del payload da inserire nel db
    let payload = req.body;
    console.log(req);

    // console.log("Payload:", payload);

    // setto la data di creazione, potrei usare timestamp integrato in MongoDB?
    payload.created_at = Date.now();

    console.log("Sto inserendo il seguente prodotto:", payload);

    const result = await Product.create(payload);

    if (result) {
      res.status(200).send(result);
    } else {
      throw new Error("Prodotto non inserito correttamente");
    }
  } catch(err) {
    console.log(err);
    res.status(500).send(err);
  }
}

// se non mando una query string con il titolo, ritorna tutto il catalogo prodotti
const readProducts = async (req, res) => {
  try {
    const id = req.query.id;
    const result = await Product.find(
      id ? { _id: id } : {});
    if (!result) {
      res.status(404).send("Non trovato");
    }
    res.status(200).send(result);
  } catch(err) {
    res.status(400).send(err);
  }
}

const insertOrder = async (req, res) => {

    const userId = req.body._id;
    const userAuth = req.userAuth;

    console.log("user aut", userAuth);
    console.log(userId);

    if (userId != userAuth) {
      res.status(403).send({error: "Autorizzazione negata"});
      return;
    }

    const payload = req.body.order;

    if (payload && userId) {
      payload.placed_at = Date.now();
    } else {
      res.status(400).send({error: "Dati mancanti nella richiesta"});
      return;
    }

    try {

      const user = await User.findById(userId);
      console.log("Ho trovato questo utente:", user);

      if (!user) {
        res.status(404).send({error: "Utente non trovato"});
        return;
      }

      user.order.push(payload);
      const result = await user.save();

      if (!result) {
        res.status(500).send({error: "Non sono riuscito a salvare l'ordine"});
        return;
      }

      res.status(200).send(result);

    } catch(err) {
      res.status(500).send({error: err.message});
    }
}

const readOrder = async (req, res) => {

    const userAuth = req.userAuth;

    try {

      const user = await User.findById(userAuth);

      if (!user.order) {
        res.status(404).send({error: "Utente non trovato"});
        return;
      }

      res.status(200).send(user.order);

    } catch(err) {
      res.status(500).send({error: err.message});
    }
}

const updateUser = async (req, res) => {
  
  const userId = req.body._id;
  const userAuth = req.userAuth;

  if (userId != userAuth) {
    res.status(403).send("Autorizzazione negata");
    return;
  }
  const payload = req.body.update;

  if (!userId || !payload) {
    res.status(400).send("User id o oggetto update mancanti");
    return;
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).send({error: "Utente non trovato"});
      return;
    }
    
    for (const i in payload) {
      user[i] = payload[i];
    }
    
    const result = await user.save();
    if (!result) {
      res.status(500).send("Non sono riuscito a fare l'update");
      return;
    }

    res.status(200).send(result);

  } catch(err) {
    res.status(500).send(err.message);
  }
}

// export delle funzioni per CRUD API
export { 
    insertProduct,
    readProducts,
    insertOrder,
    updateUser,
    readOrder,
}
