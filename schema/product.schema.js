import mongoose from "mongoose";

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const ProductSchema = new Schema({
  title: {type: String, required: true},
  platform: {type: String, required: true},
  price: {type: Number, required: true}
});

const Product = mongoose.model("Product", ProductSchema);

export {
    Product,
}

