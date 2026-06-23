import  express  from "express"
import { createProduct, deleteProduct, deleteProductVideo, getProduct, getProducts, updateProduct, uploadProductVideo } from "../controllers/productController.js"
import upload from "../middleware/upload.js"
import { authorize, protect } from "../middleware/auth.js"

const ProductRouter = express.Router()

ProductRouter.get('/',getProducts)
ProductRouter.get('/:id',getProduct)
ProductRouter.post('/',upload.array("images",10),protect,authorize('admin'),createProduct)
ProductRouter.put('/:id',upload.array("images",10),protect,authorize('admin'),updateProduct)
ProductRouter.delete('/:id',protect,authorize('admin'),deleteProduct)

ProductRouter.post('/:id/video', upload.single("video"), protect, authorize('admin'), uploadProductVideo)
ProductRouter.delete('/:id/video', protect, authorize('admin'), deleteProductVideo)

export default ProductRouter;