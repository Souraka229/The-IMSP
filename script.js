import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Initialisation de Supabase
const supabaseUrl = 'https://rvkurtvyxwcehapzhirm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2a3VydHZ5eHdjZWhhcHpoaXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTM0MTAsImV4cCI6MjA3NDAyOTQxMH0.3h_JEBWAwLNODRzh-ysd9fg0IwgviiQQGgTN-A4pxKA';
const supabase = createClient(supabaseUrl, supabaseKey);

// Éléments DOM
const authModal = document.getElementById('authModal');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authForm = document.getElementById('authForm');
const modalTitle = document.getElementById('modalTitle');
const authButton = document.getElementById('authButton');
const usernameInput = document.getElementById('username');
const switchToRegister = document.getElementById('switchToRegister');
const postForm = document.getElementById('postSubmit');
const postsGrid = document.getElementById('postsGrid');
const groupSelect = document.getElementById('groupSelect');
const suggestionList = document.getElementById('suggestionList');
const userNav = document.getElementById('userNav');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const postAvatar = document.getElementById('postAvatar');

// Gestion de l'authentification
function openModal(type) {
    authModal.style.display = 'flex';
    modalTitle.textContent = type === 'register' ? 'Inscription' : 'Connexion';
    authButton.textContent = type === 'register' ? 'S\'inscrire' : 'Se connecter';
    usernameInput.style.display = type === 'register' ? 'block' : 'none';
    document.getElementById('switchText').innerHTML = type === 'register' 
        ? 'Déjà un compte ? <a href="#" id="switchToLogin">Se connecter</a>'
        : 'Pas de compte ? <a href="#" id="switchToRegister">S\'inscrire</a>';
    document.getElementById('switchToRegister')?.addEventListener('click', () => openModal('register'));
    document.getElementById('switchToLogin')?.addEventListener('click', () => openModal('login'));
}

loginBtn?.addEventListener('click', () => openModal('login'));
switchToRegister?.addEventListener('click', () => openModal('register'));
document.querySelector('.modal-close')?.addEventListener('click', () => authModal.style.display = 'none');

authForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const username = usernameInput.value;
    const isRegister = authButton.textContent.includes('Inscrire');

    if (isRegister) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { username } }
        });
        if (!error) {
            await supabase.from('profiles').insert({
                user_id: data.user.id,
                username,
                avatar_url: 'assets/avatar-default.png'
            });
        } else {
            alert(`Erreur: ${error.message}`);
            return;
        }
    } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            alert(`Erreur: ${error.message}`);
            return;
        }
    }
    authModal.style.display = 'none';
    updateUI();
});

logoutBtn?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    updateUI();
});

// Mettre à jour l'interface utilisateur
async function updateUI() {
    const { data: { session } } = await supabase.auth.getSession();
    loginBtn.style.display = session ? 'none' : 'inline-flex';
    logoutBtn.style.display = session ? 'inline-flex' : 'none';
    userNav.style.display = session ? 'inline-flex' : 'none';
    
    if (session) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('user_id', session.user.id)
            .single();
        userName.textContent = profile.username;
        userAvatar.src = profile.avatar_url || 'assets/avatar-default.png';
        postAvatar.src = profile.avatar_url || 'assets/avatar-default.png';
    } else {
        postsGrid.innerHTML = '<p class="post-text">Connecte-toi pour voir le fil d\'actualité !</p>';
    }
    
    loadPosts();
    loadGroups();
    loadSuggestions();
}

// Charger les posts
async function loadPosts() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const { data: posts, error } = await supabase
        .from('posts')
        .select(`
            id, content, media_url, media_type, created_at,
            profiles(username, avatar_url),
            groups(name)
        `)
        .order('created_at', { ascending: false })
        .limit(20);
    
    if (error) {
        console.error('Erreur chargement posts:', error);
        return;
    }

    postsGrid.innerHTML = posts.map(post => `
        <div class="post fade-in">
            <img src="${post.profiles.avatar_url || 'assets/avatar-default.png'}" alt="Avatar" class="post-avatar">
            <div class="post-content">
                <div class="post-header">
                    <span class="post-username">${post.profiles.username}</span>
                    <span class="post-time">${new Date(post.created_at).toLocaleString()}</span>
                </div>
                <p class="post-text">${post.content || ''}</p>
                ${post.media_url ? (post.media_type === 'video' ? 
                    `<div class="post-media"><video src="${post.media_url}" controls></video></div>` : 
                    `<div class="post-media"><img src="${post.media_url}" alt="Post"></div>`) : ''}
                ${post.groups?.name ? `<p class="post-text">Dans ${post.groups.name}</p>` : ''}
                <div class="post-actions">
                    <div class="post-action" onclick="commentPost('${post.id}')">
                        <i class="far fa-comment"></i>
                        <span>0</span>
                    </div>
                    <div class="post-action" onclick="retweetPost('${post.id}')">
                        <i class="fas fa-retweet"></i>
                        <span>0</span>
                    </div>
                    <div class="post-action" onclick="likePost('${post.id}')">
                        <i class="far fa-heart"></i>
                        <span>0</span>
                    </div>
                    <div class="post-action" onclick="sharePost('${post.id}')">
                        <i class="fas fa-share"></i>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Publier un post
postForm?.addEventListener('click', async (e) => {
    e.preventDefault();
    const content = document.getElementById('postContent').value;
    const file = document.getElementById('postMedia')?.files[0];
    const groupId = groupSelect?.value;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert('Connecte-toi !');

    let mediaUrl = null, mediaType = null;
    if (file) {
        const { data, error } = await supabase.storage
            .from('imsp-media')
            .upload(`public/${Date.now()}_${file.name}`, file, { upsert: true });
        if (error) return alert(`Erreur: ${error.message}`);
        mediaUrl = supabase.storage.from('imsp-media').getPublicUrl(data.path).data.publicUrl;
        mediaType = file.type.startsWith('video/') ? 'video' : 'image';
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', session.user.id)
        .single();

    const { error } = await supabase.from('posts').insert({
        user_id: session.user.id,
        username: profile.username,
        content,
        media_url: mediaUrl,
        media_type: mediaType,
        group_id: groupId || null
    });

    if (error) alert(`Erreur: ${error.message}`);
    else {
        document.getElementById('postContent').value = '';
        document.getElementById('postMedia').value = '';
        loadPosts();
    }
});

// Charger les groupes pour le sélecteur
async function loadGroups() {
    if (!groupSelect) return;
    const { data: groups } = await supabase.from('groups').select('id, name').order('name');
    groupSelect.innerHTML = '<option value="">Pas de groupe</option>' + 
        groups.map(group => `<option value="${group.id}">${group.name}</option>`).join('');
}

// Charger les suggestions d'amis
async function loadSuggestions() {
    if (!suggestionList) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: profiles } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .neq('user_id', session.user.id)
        .limit(5);
    suggestionList.innerHTML = profiles.map(profile => `
        <div class="suggestion-item">
            <img src="${profile.avatar_url || 'assets/avatar-default.png'}" alt="Avatar" class="user-avatar">
            <div class="suggestion-info">
                <h4>${profile.username}</h4>
                <p>@${profile.username}</p>
            </div>
            <button class="follow-btn" onclick="sendFriendRequest('${profile.user_id}')">Suivre</button>
        </div>
    `).join('');
}

// Placeholder pour les interactions (à implémenter selon besoins)
function likePost(postId) { console.log(`Like post ${postId}`); }
function commentPost(postId) { console.log(`Comment post ${postId}`); }
function retweetPost(postId) { console.log(`Retweet post ${postId}`); }
function sharePost(postId) { console.log(`Share post ${postId}`); }
function sendFriendRequest(userId) { console.log(`Friend request to ${userId}`); }

// Initialisation
updateUI();