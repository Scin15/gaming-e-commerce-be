import mongoose from "mongoose";

const Schema = mongoose.Schema;

// definisco lo schema categorie che uso per l'array category nello schema per i prodotti
const CategorySchema = new Schema({
  tag: {type: String, required: true},
  name: {type: String}
})

const PlatformSchema = new Schema({
  tag: {type: String, required: true},
  name: {type: String}
})

const ProductSchema = new Schema({
  
  title: {type: String, required: true},
  platform: {type: PlatformSchema, required: true},
  price: {type: Number, required: true},
  desc: {type: String},
  img_cover: {type: String},
  img_misc: [{type: String}],
  category: {type: [CategorySchema], required: true, default: undefined},
  insert_at: {type: Date},
  update_at: {type: Date},
});

const Product = mongoose.model("Product", ProductSchema);

export {
    Product,
}

