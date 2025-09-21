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
        if (!error) await supabase.from('profiles').insert({ user_id: data.user.id, username });
    } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    }
    if (error) alert(`Erreur: ${error.message}`);
    else authModal.style.display = 'none';
    updateUI();
});

logoutBtn?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    updateUI();
});

function openModal(type) {
    authModal.style.display = 'flex';
    modalTitle.textContent = type === 'register' ? 'Inscription' : 'Connexion';
    authButton.textContent = type === 'register' ? 'S\'inscrire' : 'Se connecter';
    usernameInput.style.display = type === 'register' ? 'block' : 'none';
}

document.querySelector('.close')?.addEventListener('click', () => authModal.style.display = 'none');

// Mettre à jour l'UI selon l'état de connexion
async function updateUI() {
    const { data: { session } } = await supabase.auth.getSession();
    loginBtn.style.display = session ? 'none' : 'inline';
    logoutBtn.style.display = session ? 'inline' : 'none';
    loadPosts();
    loadProfile();
    loadFriends();
    loadGroups();
    loadChats();
}

// Charger le feed
async function loadPosts() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        document.getElementById('postsGrid').innerHTML = '<p>Connecte-toi, étudiant IMSP !</p>';
        return;
    }
    const { data: posts } = await supabase
        .from('posts')
        .select(`
            id, content, media_url, media_type, created_at,
            profiles(username, avatar_url),
            groups(name)
        `)
        .order('created_at', { ascending: false })
        .limit(20);
    document.getElementById('postsGrid').innerHTML = posts.map(post => `
        <div class="post-card">
            <img src="${post.profiles.avatar_url || 'assets/avatar-default.png'}" alt="Avatar" class="avatar">
            <h3>${post.profiles.username}</h3>
            <p>${post.content || ''}</p>
            ${post.media_url ? (post.media_type === 'video' ? 
                `<video src="${post.media_url}" controls width="100%"></video>` : 
                `<img src="${post.media_url}" alt="Post" style="max-width:100%;">`) : ''}
            <p>${post.groups?.name ? `Dans ${post.groups.name}` : ''} - ${new Date(post.created_at).toLocaleString()}</p>
            <button onclick="likePost('${post.id}')">Like</button>
        </div>
    `).join('');
}

// Publier un post
const postForm = document.getElementById('postForm');
postForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = document.getElementById('content').value;
    const file = document.getElementById('media')?.files[0];
    const groupId = document.getElementById('groupSelect')?.value;
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

    const { error } = await supabase.from('posts').insert({
        user_id: session.user.id,
        username: session.user.user_metadata.username,
        content,
        media_url: mediaUrl,
        media_type: mediaType,
        group_id: groupId || null
    });
    if (error) alert(`Erreur: ${error.message}`);
    else {
        alert('Post publié !');
        postForm.reset();
        loadPosts();
    }
});

// Charger le profil
async function loadProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !document.getElementById('profileInfo')) return;
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
    document.getElementById('profileInfo').innerHTML = `
        <img src="${profile.avatar_url || 'assets/avatar-default.png'}" alt="Avatar" class="avatar">
        <h3>${profile.username}</h3>
        <p>${profile.bio || 'Aucun bio'}</p>
        <button onclick="updateProfile()">Modifier</button>
    `;
    loadMyPosts();
}

async function updateProfile() {
    const bio = prompt('Nouvelle bio :');
    if (bio) {
        await supabase.from('profiles').update({ bio }).eq('user_id', (await supabase.auth.getSession()).data.session.user.id);
        loadProfile();
    }
}

async function loadMyPosts() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: posts } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
    document.getElementById('myPosts').innerHTML = posts.map(post => `
        <div class="post-card">${post.content} - ${new Date(post.created_at).toLocaleString()}</div>
    `).join('');
}

// Amis
async function loadFriends() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !document.getElementById('friendRequests')) return;
    const { data: requests } = await supabase
        .from('friend_requests')
        .select('id, sender_id, status, profiles(username)')
        .eq('receiver_id', session.user.id)
        .eq('status', 'pending');
    document.getElementById('friendRequests').innerHTML = requests.map(req => `
        <div>${req.profiles.username} vous a ajouté : 
            <button onclick="acceptFriend('${req.id}')">Accepter</button>
            <button onclick="rejectFriend('${req.id}')">Refuser</button>
        </div>
    `).join('');
}

async function sendFriendRequest(receiverId) {
    const { error } = await supabase.from('friend_requests').insert({
        sender_id: (await supabase.auth.getSession()).data.session.user.id,
        receiver_id: receiverId,
        status: 'pending'
    });
    if (error) alert(`Erreur: ${error.message}`);
}

async function acceptFriend(requestId) {
    await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', requestId);
    loadFriends();
}

async function rejectFriend(requestId) {
    await supabase.from('friend_requests').delete().eq('id', requestId);
    loadFriends();
}

// Groupes
async function loadGroups() {
    const { data: groups } = await supabase.from('groups').select('*');
    const select = document.getElementById('groupSelect');
    const list = document.getElementById('groupsList');
    if (select) select.innerHTML = '<option value="">Pas de groupe</option>' + groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
    if (list) list.innerHTML = groups.map(g => `
        <div class="group-card">
            <h3>${g.name}</h3>
            <p>${g.description}</p>
            <button onclick="joinGroup('${g.id}')">Rejoindre</button>
        </div>
    `).join('');
}

const createGroupBtn = document.getElementById('createGroupBtn');
const groupModal = document.getElementById('groupModal');
createGroupBtn?.addEventListener('click', () => groupModal.style.display = 'flex');

document.querySelector('#groupModal .close')?.addEventListener('click', () => groupModal.style.display = 'none');

const groupForm = document.getElementById('groupForm');
groupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('groupName').value;
    const description = document.getElementById('groupDescription').value;
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from('groups').insert({ name, description, created_by: session.user.id });
    if (error) alert(`Erreur: ${error.message}`);
    else groupModal.style.display = 'none';
    loadGroups();
});

async function joinGroup(groupId) {
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from('group_members').insert({ group_id: groupId, user_id: session.user.id });
    if (error) alert(`Erreur: ${error.message}`);
    else loadGroups();
}

// Messages
async function loadChats() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !document.getElementById('chatSelect')) return;
    const { data: friends } = await supabase
        .from('friend_requests')
        .select('receiver_id, profiles(username)')
        .eq('sender_id', session.user.id)
        .eq('status', 'accepted');
    document.getElementById('chatSelect').innerHTML = '<option value="">Choisis un ami</option>' + friends.map(f => `<option value="${f.receiver_id}">${f.profiles.username}</option>`).join('');
}

const messageForm = document.getElementById('messageForm');
messageForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = document.getElementById('messageContent').value;
    const receiverId = document.getElementById('chatSelect').value;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !receiverId) return alert('Choisis un ami !');
    const { error } = await supabase.from('messages').insert({
        sender_id: session.user.id,
        receiver_id: receiverId,
        content
    });
    if (error) alert(`Erreur: ${error.message}`);
    else {
        messageForm.reset();
        loadChatMessages(receiverId);
    }
});

async function loadChatMessages(receiverId) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
        .eq('receiver_id', receiverId)
        .order('created_at', { ascending: true });
    document.getElementById('chatBox').innerHTML = messages.map(msg => `
        <div class="${msg.sender_id === session.user.id ? 'sent' : 'received'}">
            ${msg.content} - ${new Date(msg.created_at).toLocaleTimeString()}
        </div>
    `).join('');
}

document.getElementById('chatSelect')?.addEventListener('change', (e) => loadChatMessages(e.target.value));

// Notifications (basique)
function showNotification(message) {
    const notifications = document.getElementById('notifications');
    notifications.innerHTML += `<div class="notification">${message}</div>`;
}

// Temps réel
supabase.channel('public:posts').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, loadPosts).subscribe();
supabase.channel('public:friend_requests').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friend_requests' }, loadFriends).subscribe();
supabase.channel('public:messages').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
    const receiverId = document.getElementById('chatSelect')?.value;
    if (receiverId) loadChatMessages(receiverId);
    showNotification('Nouveau message !');
}).subscribe();

updateUI();