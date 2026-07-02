import Order from "../models/Order.js";
import Product from "../models/Products.js";

export const backfillOrderItemNames = async () => {
  try {
    const orders = await Order.find({ "items.name": { $exists: false } });

    if (orders.length === 0) {
      console.log("✅ Aucune commande à corriger.");
      return;
    }

    console.log(`🔧 ${orders.length} commande(s) à corriger...`);

    let updatedCount = 0;
    let missingProductCount = 0;

    for (const order of orders) {
      let modified = false;

      for (const item of order.items) {
        if (!item.name) {
          const product = await Product.findById(item.product).lean();
          if (product) {
            item.name = product.name;
            item.image = product.images?.[0] || null;
            modified = true;
          } else {
            item.name = "Produit supprimé";
            item.image = null;
            modified = true;
            missingProductCount++;
          }
        }
      }

      if (modified) {
        await order.save();
        updatedCount++;
      }
    }

    console.log(`✅ Backfill terminé : ${updatedCount} commande(s) mise(s) à jour.`);
    if (missingProductCount > 0) {
      console.log(`⚠️  ${missingProductCount} article(s) référençaient un produit supprimé — nommés "Produit supprimé".`);
    }
  } catch (error: any) {
    console.error("❌ Erreur pendant le backfill:", error.message);
  }
};