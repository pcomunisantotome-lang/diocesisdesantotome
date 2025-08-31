import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";

// Configuración de Firebase (debe coincidir con la de tu sitio)
const firebaseConfig = {
    apiKey: "AIzaSyCIC457rky1NFQCas3uWFfIDVRBHfdbEAQ",
    authDomain: "diocesisdesantotome.firebaseapp.com",
    projectId: "diocesisdesantotome",
    storageBucket: "diocesisdesantotome.firebasestorage.app",
    messagingSenderId: "313851932898",
    appId: "1:313851932898:web:0b7e65d0da8d09d762aebb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Esta función se ejecutará en el servidor de Netlify
export default async (request, context) => {
    try {
        // Obtenemos la página noticia.html original
        const response = await context.next();
        let page = await response.text();

        // Extraemos el ID de la noticia desde la URL
        const url = new URL(request.url);
        const newsId = url.searchParams.get('id');

        // Si no hay ID o el visitante no es un bot, devolvemos la página sin modificar
        const userAgent = request.headers.get("user-agent") || "";
        const isBot = /bot|facebook|whatsapp|twitter|slack|linkedin|googlebot|bingbot/i.test(userAgent);

        if (!newsId || !isBot) {
            return new Response(page, response);
        }

        // Si es un bot y hay un ID, vamos a buscar la noticia a Firebase
        const docRef = doc(db, "noticias", newsId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const news = docSnap.data();
            const description = (news.summary || '').replace(/<[^>]+>/g, '').substring(0, 160);
            const imageUrl = news.featuredImageUrl || 'https://firebasestorage.googleapis.com/v0/b/diocesisdesantotome.firebasestorage.app/o/LOGOS%2Flogo%20iglesia%20samaritana.png?alt=media&token=56fd32c1-bb7d-4537-83f7-ace6662ff768';

            // Reemplazamos los metadatos en el HTML de la página
            page = page.replace(/<title>.*?<\/title>/, `<title>${news.title} | Diócesis de Santo Tomé</title>`);
            page = page.replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${news.title}">`);
            page = page.replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${description}">`);
            page = page.replace(/<meta property="og:image" content=".*?">/, `<meta property="og:image" content="${imageUrl}">`);
            page = page.replace(/<meta property="og:url" content=".*?">/, `<meta property="og:url" content="${url.href}">`);
        }

        // Devolvemos la página con los metadatos ya insertados
        return new Response(page, response);

    } catch (error) {
        console.error("Error en la Edge Function:", error);
        return context.next(); // En caso de error, devolvemos la página original
    }
};
