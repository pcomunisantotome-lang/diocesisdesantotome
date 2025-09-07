// Importaciones de Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { promises as fs } from 'fs';
import path from 'path';

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCIC457rky1NFQCas3uWFfIDVRBHfdbEAQ",
    authDomain: "diocesisdesantotome.firebaseapp.com",
    projectId: "diocesisdesantotome",
    storageBucket: "diocesisdesantotome.firebasestorage.app",
    messagingSenderId: "313851932898",
    appId: "1:313851932898:web:0b7e65d0da8d09d762aebb"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Esta es la función que se ejecutará en los servidores de Vercel
export default async function handler(req, res) {
    try {
        const { id } = req.query; // Así se obtiene el ID de la noticia en Vercel
        const userAgent = req.headers['user-agent'] || "";
        const isBot = /bot|facebook|whatsapp|twitter|slack|linkedin|googlebot|bingbot/i.test(userAgent);

        // Leemos el archivo noticia.html original
        const filePath = path.join(process.cwd(), 'noticia.html');
        let page = await fs.readFile(filePath, 'utf-8');

        // Si es un bot y hay un ID, modificamos el HTML
        if (id && isBot) {
            const docRef = doc(db, "noticias", id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const news = docSnap.data();
                const description = (news.summary || '').replace(/<[^>]+>/g, '').substring(0, 160);
                const imageUrl = news.featuredImageUrl || 'https://firebasestorage.googleapis.com/v0/b/diocesisdesantotome.firebasestorage.app/o/LOGOS%2Flogo%20iglesia%20samaritana.png?alt=media&token=56fd32c1-bb7d-4537-83f7-ace6662ff768';
                const fullUrl = `https://${req.headers.host}${req.url}`;

                // Reemplazamos los metadatos
                page = page.replace(/<title>.*?<\/title>/, `<title>${news.title} | Diócesis de Santo Tomé</title>`);
                page = page.replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${news.title}">`);
                page = page.replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${description}">`);
                page = page.replace(/<meta property="og:image" content=".*?">/, `<meta property="og:image" content="${imageUrl}">`);
                page = page.replace(/<meta property="og:url" content=".*?">/, `<meta property="og:url" content="${fullUrl}">`);
            }
        }
        
        // Enviamos la página (modificada o no) al visitante
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(page);

    } catch (error) {
        console.error("Error en la Vercel Function:", error);
        // En caso de error, intentamos servir la página original
        try {
            const filePath = path.join(process.cwd(), 'noticia.html');
            const page = await fs.readFile(filePath, 'utf-8');
            res.setHeader('Content-Type', 'text/html');
            res.status(200).send(page);
        } catch (fallbackError) {
            res.status(500).send('Error al cargar la página.');
        }
    }
}

