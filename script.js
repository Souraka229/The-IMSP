import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = 'https://rvkurtvyxwcehapzhirm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2a3VydHZ5eHdjZWhhcHpoaXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTM0MTAsImV4cCI6MjA3NDAyOTQxMH0.3h_JEBWAwLNODRzh-ysd9fg0IwgviiQQGgTN-A4pxKA';
const supabase = createClient(supabaseUrl, supabaseKey);

// Authentification
const authModal = document.getElementById('authModal');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authForm = document.getElementById('authForm');
const modalTitle = document.getElementById('modalTitle');
const authButton = document.getElementById('authButton');
const usernameInput = document.getElementById('username');

loginBtn?.addEventListener('click', () => openModal('login'));
document.getElementById('registerBtn')?.addEventListener('click', () => openModal('register'));

authForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const username = usernameInput.value;
    const isRegister = authButton.textContent.includes('Inscrire');

    if (isRegister) {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username } } });
        if (error) alert(`Erreur: ${error.message}`);
        else alert('Inscription réussie ! Confirme ton email.');
    } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) alert(`Erreur: ${error.message}`);
        else authModal.style.display = 'none';
    }
    loadPosts();
});

logoutBtn?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    logoutBtn.style.display = 'none';
    loginBtn.style.display = 'inline';
    loadPosts();
});

function openModal(type) {
    authModal.style.display = 'flex';
    modalTitle.textContent = type === 'register' ? 'Inscription' : 'Connexion';
    authButton.textContent = type === 'register' ? 'S\'inscrire' : 'Se connecter';
    usernameInput.style.display = type === 'register' ? 'block' : 'none';
}

document.querySelector('.close')?.addEventListener('click', () => authModal.style.display = 'none');

// Charger et mettre à jour les posts
async function loadPosts() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        document.getElementById('postsGrid').innerHTML = '<p>Connecte-toi pour voir les posts.</p>';
        return;
    }
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'inline';

    const { data: posts, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    if (error) console.error(error);
    const postsGrid = document.getElementById('postsGrid');
    postsGrid.innerHTML = '';
    posts?.forEach(post => {
        const card = document.createElement('div');
        card.className = 'post-card';
        card.innerHTML = `
            <h3>${post.username}</h3>
            <p>${post.content || 'Pas de contenu'}</p>
            ${post.media_url ? (post.media_type === 'video' ? 
                `<video src="${post.media_url}" controls width="100%"></video>` : 
                `<img src="${post.media_url}" alt="Post IMSP" style="max-width:100%;">`) : ''}
            <p>${new Date(post.created_at).toLocaleString()}</p>
        `;
        postsGrid.appendChild(card);
    });
}

// Publier un post
const postForm = document.getElementById('postForm');
postForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = document.getElementById('content').value;
    const file = document.getElementById('media')?.files[0];
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert('Connecte-toi pour publier !');

    let mediaUrl = null;
    let mediaType = null;
    if (file) {
        const { data, error: uploadError } = await supabase.storage
            .from('imsp-media')
            .upload(`public/${Date.now()}_${file.name}`, file, { upsert: true });
        if (uploadError) return alert(`Erreur upload: ${uploadError.message}`);
        mediaUrl = supabase.storage.from('imsp-media').getPublicUrl(data.path).data.publicUrl;
        mediaType = file.type.startsWith('video/') ? 'video' : 'image';
    }

    const { error } = await supabase.from('posts').insert({
        user_id: session.user.id,
        username: session.user.user_metadata.username || session.user.email.split('@')[0],
        content,
        media_url: mediaUrl,
        media_type: mediaType
    });
    if (error) alert(`Erreur: ${error.message}`);
    else {
        alert('Post publié sur The IMSP !');
        postForm.reset();
        if (window.location.pathname.includes('post.html')) window.location.href = '../index.html';
        else loadPosts();
    }
});

// Temps réel
supabase.channel('public:posts').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, loadPosts).subscribe();

// Charge initial
loadPosts();