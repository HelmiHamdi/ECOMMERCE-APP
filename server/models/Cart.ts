import mongoose, { Schema } from "mongoose";
import { ICart, ICartItem } from "../types/index.js";



const cartItemsSchema = new Schema<ICartItem>({
    product: {type: mongoose.Schema.Types.ObjectId, ref: 'Product',
        required: true
    },
    quantity: {type: Number, required:true, min: 1, default:1},
    price: {type: Number, required:true},
    size: {type: String},

})

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