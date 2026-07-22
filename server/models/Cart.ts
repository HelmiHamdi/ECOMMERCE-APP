import mongoose, { Schema } from "mongoose";
import { ICart, ICartItem } from "../types/index.js";

const cartItemsSchema = new Schema<ICartItem>({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: false,
        default: null,
    },
    quantity: {type: Number, required:true, min: 1, default:1},
    price: {type: Number, required:true},
    size: {type: String},
    offerId: {type: mongoose.Schema.Types.ObjectId, ref: 'Offer', default: null},


    offerTitle: { type: String, default: null },
    offerImage: { type: String, default: null },
})


cartItemsSchema.pre("validate", function (this: any) {
  if (!this.product && !this.offerId) {
    throw new Error("Un item du panier doit être lié à un produit ou à une offre");
  }
});

const cartShcema = new Schema<ICart>({
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User',
        required: true , unique: true
    },
    items : [cartItemsSchema],
    totalAmount:{type : Number, default:0}
},{timestamps: true}
)

cartShcema.methods.calculateTotal = function(this: ICart){
    this.totalAmount = this.items.reduce((total: number, item: ICartItem)=>{
        return total + item.price * item.quantity
    },0)
    return this.totalAmount;
}

const Cart = mongoose.model<ICart>('Cart', cartShcema);

export default Cart;