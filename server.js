const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// JSON Database Files
const DB_PATH = path.join(__dirname, 'database');
const USERS_FILE = path.join(DB_PATH, 'users.json');
const POSTS_FILE = path.join(DB_PATH, 'posts.json');
const COMMENTS_FILE = path.join(DB_PATH, 'comments.json');
const FOLLOWERS_FILE = path.join(DB_PATH, 'followers.json');
const LIKES_FILE = path.join(DB_PATH, 'likes.json');

// Initialize Database
if (!fs.existsSync(DB_PATH)) {
  fs.mkdirSync(DB_PATH);
}

function initDB() {
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]));
  if (!fs.existsSync(POSTS_FILE)) fs.writeFileSync(POSTS_FILE, JSON.stringify([]));
  if (!fs.existsSync(COMMENTS_FILE)) fs.writeFileSync(COMMENTS_FILE, JSON.stringify([]));
  if (!fs.existsSync(FOLLOWERS_FILE)) fs.writeFileSync(FOLLOWERS_FILE, JSON.stringify([]));
  if (!fs.existsSync(LIKES_FILE)) fs.writeFileSync(LIKES_FILE, JSON.stringify([]));
}

initDB();

// Database helper functions
function readDB(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeDB(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ========== AUTHENTICATION APIs ==========

// Register User
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }

  try {
    const users = readDB(USERS_FILE);
    
    if (users.find(u => u.email === email || u.username === username)) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: users.length + 1,
      username,
      email,
      password: hashedPassword,
      bio: '',
      profile_pic: 'https://via.placeholder.com/150',
      created_at: new Date().toISOString()
    };
    
    users.push(newUser);
    writeDB(USERS_FILE, users);
    
    res.json({ 
      success: true, 
      userId: newUser.id,
      message: 'Registration successful!' 
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login User
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  const users = readDB(USERS_FILE);
  const user = users.find(u => u.email === email);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const validPassword = await bcrypt.compare(password, user.password);
  
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.json({
    success: true,
    userId: user.id,
    username: user.username,
    email: user.email,
    bio: user.bio,
    profile_pic: user.profile_pic
  });
});

// ========== USER PROFILE APIs ==========

// Get User Profile
app.get('/api/user/:id', (req, res) => {
  const users = readDB(USERS_FILE);
  const posts = readDB(POSTS_FILE);
  const followers = readDB(FOLLOWERS_FILE);
  
  const userId = parseInt(req.params.id);
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const userProfile = {
    id: user.id,
    username: user.username,
    email: user.email,
    bio: user.bio,
    profile_pic: user.profile_pic,
    created_at: user.created_at,
    followers: followers.filter(f => f.following_id === userId).length,
    following: followers.filter(f => f.follower_id === userId).length,
    posts_count: posts.filter(p => p.user_id === userId).length
  };
  
  res.json(userProfile);
});

// Update Profile
app.put('/api/user/:id', (req, res) => {
  const { bio, profile_pic } = req.body;
  const users = readDB(USERS_FILE);
  const userId = parseInt(req.params.id);
  
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex !== -1) {
    users[userIndex].bio = bio || '';
    users[userIndex].profile_pic = profile_pic || 'https://via.placeholder.com/150';
    writeDB(USERS_FILE, users);
  }
  
  res.json({ success: true, message: 'Profile updated!' });
});

// ========== POSTS APIs ==========

// Get All Posts
app.get('/api/posts', (req, res) => {
  const posts = readDB(POSTS_FILE);
  const users = readDB(USERS_FILE);
  const comments = readDB(COMMENTS_FILE);
  
  const postsWithUser = posts.map(post => {
    const user = users.find(u => u.id === post.user_id);
    const comment_count = comments.filter(c => c.post_id === post.id).length;
    
    return {
      ...post,
      username: user ? user.username : 'Unknown',
      profile_pic: user ? user.profile_pic : 'https://via.placeholder.com/150',
      comment_count
    };
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  res.json(postsWithUser);
});

// Get Posts by User
app.get('/api/posts/user/:userId', (req, res) => {
  const posts = readDB(POSTS_FILE);
  const users = readDB(USERS_FILE);
  const comments = readDB(COMMENTS_FILE);
  const userId = parseInt(req.params.userId);
  
  const userPosts = posts
    .filter(p => p.user_id === userId)
    .map(post => {
      const user = users.find(u => u.id === post.user_id);
      const comment_count = comments.filter(c => c.post_id === post.id).length;
      
      return {
        ...post,
        username: user ? user.username : 'Unknown',
        profile_pic: user ? user.profile_pic : 'https://via.placeholder.com/150',
        comment_count
      };
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  res.json(userPosts);
});

// Create Post
app.post('/api/posts', (req, res) => {
  const { user_id, content, image } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'Content required' });
  }
  
  const posts = readDB(POSTS_FILE);
  const newPost = {
    id: posts.length + 1,
    user_id: parseInt(user_id),
    content,
    image: image || '',
    likes: 0,
    created_at: new Date().toISOString()
  };
  
  posts.push(newPost);
  writeDB(POSTS_FILE, posts);
  
  res.json({ 
    success: true, 
    postId: newPost.id,
    message: 'Post created!' 
  });
});

// Delete Post
app.delete('/api/posts/:id', (req, res) => {
  const postId = parseInt(req.params.id);
  
  let posts = readDB(POSTS_FILE);
  let comments = readDB(COMMENTS_FILE);
  let likes = readDB(LIKES_FILE);
  
  posts = posts.filter(p => p.id !== postId);
  comments = comments.filter(c => c.post_id !== postId);
  likes = likes.filter(l => l.post_id !== postId);
  
  writeDB(POSTS_FILE, posts);
  writeDB(COMMENTS_FILE, comments);
  writeDB(LIKES_FILE, likes);
  
  res.json({ success: true, message: 'Post deleted!' });
});

// ========== LIKES APIs ==========

// Like/Unlike Post
app.post('/api/posts/:postId/like', (req, res) => {
  const { user_id } = req.body;
  const postId = parseInt(req.params.postId);
  
  const likes = readDB(LIKES_FILE);
  const posts = readDB(POSTS_FILE);
  
  const existingLikeIndex = likes.findIndex(l => l.post_id === postId && l.user_id === user_id);
  
  if (existingLikeIndex !== -1) {
    likes.splice(existingLikeIndex, 1);
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex !== -1) {
      posts[postIndex].likes = Math.max(0, posts[postIndex].likes - 1);
    }
    writeDB(LIKES_FILE, likes);
    writeDB(POSTS_FILE, posts);
    res.json({ success: true, action: 'unliked' });
  } else {
    likes.push({
      id: likes.length + 1,
      post_id: postId,
      user_id: parseInt(user_id)
    });
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex !== -1) {
      posts[postIndex].likes += 1;
    }
    writeDB(LIKES_FILE, likes);
    writeDB(POSTS_FILE, posts);
    res.json({ success: true, action: 'liked' });
  }
});

// Check if user liked a post
app.get('/api/posts/:postId/liked/:userId', (req, res) => {
  const likes = readDB(LIKES_FILE);
  const postId = parseInt(req.params.postId);
  const userId = parseInt(req.params.userId);
  
  const liked = likes.some(l => l.post_id === postId && l.user_id === userId);
  res.json({ liked });
});

// ========== COMMENTS APIs ==========

// Get Comments for Post
app.get('/api/posts/:postId/comments', (req, res) => {
  const comments = readDB(COMMENTS_FILE);
  const users = readDB(USERS_FILE);
  const postId = parseInt(req.params.postId);
  
  const postComments = comments
    .filter(c => c.post_id === postId)
    .map(comment => {
      const user = users.find(u => u.id === comment.user_id);
      return {
        ...comment,
        username: user ? user.username : 'Unknown',
        profile_pic: user ? user.profile_pic : 'https://via.placeholder.com/150'
      };
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  res.json(postComments);
});

// Add Comment
app.post('/api/posts/:postId/comments', (req, res) => {
  const { user_id, comment } = req.body;
  const postId = parseInt(req.params.postId);
  
  if (!comment) {
    return res.status(400).json({ error: 'Comment required' });
  }
  
  const comments = readDB(COMMENTS_FILE);
  const newComment = {
    id: comments.length + 1,
    post_id: postId,
    user_id: parseInt(user_id),
    comment,
    created_at: new Date().toISOString()
  };
  
  comments.push(newComment);
  writeDB(COMMENTS_FILE, comments);
  
  res.json({ 
    success: true, 
    commentId: newComment.id,
    message: 'Comment added!' 
  });
});

// Delete Comment
app.delete('/api/comments/:id', (req, res) => {
  let comments = readDB(COMMENTS_FILE);
  const commentId = parseInt(req.params.id);
  
  comments = comments.filter(c => c.id !== commentId);
  writeDB(COMMENTS_FILE, comments);
  
  res.json({ success: true, message: 'Comment deleted!' });
});

// ========== FOLLOW APIs ==========

// Follow/Unfollow User
app.post('/api/follow', (req, res) => {
  const { follower_id, following_id } = req.body;
  
  if (follower_id === following_id) {
    return res.status(400).json({ error: 'Cannot follow yourself' });
  }
  
  const followers = readDB(FOLLOWERS_FILE);
  const existingIndex = followers.findIndex(
    f => f.follower_id === follower_id && f.following_id === following_id
  );
  
  if (existingIndex !== -1) {
    followers.splice(existingIndex, 1);
    writeDB(FOLLOWERS_FILE, followers);
    res.json({ success: true, action: 'unfollowed' });
  } else {
    followers.push({
      id: followers.length + 1,
      follower_id: parseInt(follower_id),
      following_id: parseInt(following_id),
      created_at: new Date().toISOString()
    });
    writeDB(FOLLOWERS_FILE, followers);
    res.json({ success: true, action: 'followed' });
  }
});

// Check if following
app.get('/api/follow/check/:followerId/:followingId', (req, res) => {
  const followers = readDB(FOLLOWERS_FILE);
  const followerId = parseInt(req.params.followerId);
  const followingId = parseInt(req.params.followingId);
  
  const following = followers.some(
    f => f.follower_id === followerId && f.following_id === followingId
  );
  
  res.json({ following });
});

// Get Followers
app.get('/api/followers/:userId', (req, res) => {
  const followers = readDB(FOLLOWERS_FILE);
  const users = readDB(USERS_FILE);
  const userId = parseInt(req.params.userId);
  
  const userFollowers = followers
    .filter(f => f.following_id === userId)
    .map(f => {
      const user = users.find(u => u.id === f.follower_id);
      return user ? {
        id: user.id,
        username: user.username,
        profile_pic: user.profile_pic,
        bio: user.bio
      } : null;
    })
    .filter(u => u !== null);
  
  res.json(userFollowers);
});

// Get Following
app.get('/api/following/:userId', (req, res) => {
  const followers = readDB(FOLLOWERS_FILE);
  const users = readDB(USERS_FILE);
  const userId = parseInt(req.params.userId);
  
  const userFollowing = followers
    .filter(f => f.follower_id === userId)
    .map(f => {
      const user = users.find(u => u.id === f.following_id);
      return user ? {
        id: user.id,
        username: user.username,
        profile_pic: user.profile_pic,
        bio: user.bio
      } : null;
    })
    .filter(u => u !== null);
  
  res.json(userFollowing);
});

// Start Server
app.listen(PORT, () => {
  console.log(`✅ Database initialized (JSON files)`);
  console.log(`🚀 Social Media Backend running on http://localhost:${PORT}`);
});