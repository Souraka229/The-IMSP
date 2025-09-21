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
document.querySelector('.modal-close')?.addEventListener('click', () => auth