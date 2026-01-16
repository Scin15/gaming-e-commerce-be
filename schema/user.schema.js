import mongoose from "mongoose";

const Schema = mongoose.Schema;

// definisco lo schema categorie che uso per l'array category nello schema per i prodotti
const OrderSchema = new Schema({
  title: {type: String, required: true},
  price: {type: Number, required: true},
  state: {
    tag: {type: String, required: true},
    desc: {type: String}
  },
  address: {type: String, required: true},
  payment: {
    tag: {type: String, required: true},
    desc: {type: String}
  },
  placed_at: {type: Date, required: true},
  shipped_at: {type: Date},
  canceled_at: {type: Date},
})

const UserSchema = new Schema({
  name: {type: String},
  surname: {type: String},
  email: {type: String, required: true, unique: true},
  address: {type: String},
  password: {type: String, required: true},
  order: {type: [OrderSchema]},
  role: {type: String, required: true, enum: ["admin","user"]},
  refresh_token: {type: String},
  created_at: {type: Date, required: true},
  updated_at: {type: Date},
  expired_at: {type: Date},
});

const User = mongoose.model("User", UserSchema);

export {
    User,
}

