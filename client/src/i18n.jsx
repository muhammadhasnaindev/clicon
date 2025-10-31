import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      "welcome": "Welcome to Clicon online eCommerce store.",
      "follow_us": "Follow us:",
      "shop_now": "Shop Now",
      "browse_all": "Browse All Product",
      "best_deals": "Best Deals",
      "featured_products": "Featured Products",
      "computer_accessories": "Computer Accessories",
      "flash_sale_today": "FLASH SALE TODAY",
      "best_sellers": "BEST SELLERS",
      "top_rated": "TOP RATED",
      "new_arrival": "NEW ARRIVAL"
    }
  },
  fr: {
    translation: {
      "welcome": "Bienvenue sur la boutique en ligne Clicon.",
      "follow_us": "Suivez-nous :",
      "shop_now": "Acheter",
      "browse_all": "Voir tous les produits",
      "best_deals": "Meilleures Offres",
      "featured_products": "Produits en vedette",
      "computer_accessories": "Accessoires Informatique",
      "flash_sale_today": "VENTE FLASH AUJOURD'HUI",
      "best_sellers": "MEILLEURES VENTES",
      "top_rated": "LES MIEUX NOTÉS",
      "new_arrival": "NOUVEAUTÉS"
    }
  },
  de: {
    translation: {
      "welcome": "Willkommen im Clicon Online-Shop.",
      "follow_us": "Folge uns:",
      "shop_now": "Jetzt kaufen",
      "browse_all": "Alle Produkte ansehen",
      "best_deals": "Top Angebote",
      "featured_products": "Empfohlene Produkte",
      "computer_accessories": "Computerzubehör",
      "flash_sale_today": "HEUTE BLITZVERKAUF",
      "best_sellers": "Bestseller",
      "top_rated": "Top bewertet",
      "new_arrival": "Neuheiten"
    }
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false }
});

export default i18n;
