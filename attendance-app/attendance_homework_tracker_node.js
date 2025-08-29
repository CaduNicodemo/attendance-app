/*
Attendance & Homework Tracker — Multi-teacher version (with ownership filtering)
-------------------------------------------------------------------------------
Stack: Node.js (Express), better-sqlite3, express-session, bcrypt, nodemailer

New in this version:
- Teachers sign up and log in.
- Each teacher manages only their own groups/students/classes.
- All queries are scoped to the logged-in teacher’s ownership.
- Notifications go to the teacher’s registered email.

Quick start:
1) Save this as server.js
2) npm init -y
3) npm i express better-sqlite3 express-session bcrypt nodemailer body-parser cookie-parser
4) node server.js
5) Visit http://localhost:3000/signup to create your teacher account
*/

const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const nodemailer = require('nodemailer');

const app = express();
const db = new Database('app.db');
const PORT = process.env.PORT || 3000;
const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@example.com';

let mailer = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
} else {
  mailer = {
    sendMail: async (opts) => {
      console.log('\n--- Email (simulated) ---');
      console.log('To:', opts.to);
      console.log('Subject:', opts.subject);
      console.log('Text:', opts.text);
      console.log('-------------------------\n');
      return { messageId: 'simulated' };
    },
  };
}

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: 'change-me-session-secret',
    resave: false,
    saveUninitialized: false,
  })
);

// --- DB schema ---
db.exec(`
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  owner_id INTEGER NOT NULL,
  FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  group_id INTEGER NOT NULL,
  FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  class_date TEXT NOT NULL,
  UNIQUE(group_id,class_date),
  FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  status TEXT CHECK(status IN ('present','absent')) NOT NULL,
  UNIQUE(class_id,student_id),
  FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS homework (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  delivered INTEGER CHECK(delivered IN (0,1)) NOT NULL,
  UNIQUE(class_id,student_id),
  FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
);
`);

// --- Helpers ---
function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}
function layout(title, content, user) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title></head><body><h1>${title}</h1>${user ? `<p>Logged in as ${user.email} | <a href="/logout">Logout</a></p>`:''}${content}</body></html>`;
}

// --- Auth routes ---
app.get('/signup', (req,res)=>{
  res.send(layout('Sign up', `<form method="post"><input name="name" placeholder="Name"/><br/><input name="email" type="email" placeholder="Email"/><br/><input name="password" type="password" placeholder="Password"/><br/><button>Sign up</button></form>`, req.session.user));
});
app.post('/signup',(req,res)=>{
  const {name,email,password} = req.body;
  const hash = bcrypt.hashSync(password,10);
  try{
    db.prepare('INSERT INTO users (email,name,password_hash) VALUES (?,?,?)').run(email,name,hash);
    res.redirect('/login');
  } catch(e){
    res.send(layout('Sign up', `<p>Error: ${e.message}</p><a href="/signup">Try again</a>`, null));
  }
});

app.get('/login',(req,res)=>{
  res.send(layout('Login', `<form method="post"><input name="email" type="email" placeholder="Email"/><br/><input name="password" type="password" placeholder="Password"/><br/><button>Login</button></form>`, null));
});
app.post('/login',(req,res)=>{
  const {email,password} = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if(!user || !bcrypt.compareSync(password,user.password_hash)) return res.send(layout('Login',`<p>Invalid credentials</p><a href="/login">Try again</a>`,null));
  req.session.user={id:user.id,email:user.email,name:user.name};
  res.redirect('/');
});
app.get('/logout',(req,res)=>{req.session.destroy(()=>res.redirect('/login'));});

// --- Groups ---
app.get('/', requireAuth,(req,res)=>{
  const groups = db.prepare('SELECT * FROM groups WHERE owner_id=?').all(req.session.user.id);
  res.send(layout('Dashboard', `<form method="post" action="/groups/create"><input name="name" placeholder="Group name"/><button>Create</button></form><ul>${groups.map(g=>`<li>${g.name} <a href="/groups/${g.id}">Open</a></li>`).join('')}</ul>`, req.session.user));
});
app.post('/groups/create', requireAuth,(req,res)=>{
  db.prepare('INSERT INTO groups (name,owner_id) VALUES (?,?)').run(req.body.name, req.session.user.id);
  res.redirect('/');
});

// --- Group detail: add students, list classes ---
app.get('/groups/:id', requireAuth,(req,res)=>{
  const group = db.prepare('SELECT * FROM groups WHERE id=? AND owner_id=?').get(req.params.id, req.session.user.id);
  if(!group) return res.send('Not found or not yours');
  const students = db.prepare('SELECT * FROM students WHERE group_id=?').all(group.id);
  const classes = db.prepare('SELECT * FROM classes WHERE group_id=?').all(group.id);
  res.send(layout(`Group: ${group.name}`, `<h2>Students</h2><form method="post" action="/groups/${group.id}/students/add"><input name="name" placeholder="Student name"/><button>Add</button></form><ul>${students.map(s=>`<li>${s.name}</li>`).join('')}</ul><h2>Classes</h2><form method="post" action="/groups/${group.id}/classes/add"><input type="date" name="class_date"/><button>Add class</button></form><ul>${classes.map(c=>`<li>${c.class_date} <a href="/classes/${c.id}">Open</a></li>`).join('')}</ul>`, req.session.user));
});

app.post('/groups/:id/students/add', requireAuth,(req,res)=>{
  const group = db.prepare('SELECT * FROM groups WHERE id=? AND owner_id=?').get(req.params.id, req.session.user.id);
  if(!group) return res.send('Not found or not yours');
  db.prepare('INSERT INTO students (name,group_id) VALUES (?,?)').run(req.body.name, group.id);
  res.redirect(`/groups/${group.id}`);
});

app.post('/groups/:id/classes/add', requireAuth,(req,res)=>{
  const group = db.prepare('SELECT * FROM groups WHERE id=? AND owner_id=?').get(req.params.id, req.session.user.id);
  if(!group) return res.send('Not found or not yours');
  db.prepare('INSERT OR IGNORE INTO classes (group_id,class_date) VALUES (?,?)').run(group.id, req.body.class_date);
  res.redirect(`/groups/${group.id}`);
});

// --- Class detail: mark attendance + homework ---
app.get('/classes/:id', requireAuth,(req,res)=>{
  const klass = db.prepare(`SELECT c.* FROM classes c JOIN groups g ON c.group_id=g.id WHERE c.id=? AND g.owner_id=?`).get(req.params.id, req.session.user.id);
  if(!klass) return res.send('Not found or not yours');
  const students = db.prepare('SELECT * FROM students WHERE group_id=?').all(klass.group_id);
  const attendance = db.prepare('SELECT * FROM attendance WHERE class_id=?').all(klass.id);
  const homework = db.prepare('SELECT * FROM homework WHERE class_id=?').all(klass.id);
  function getStatus(arr,student_id,field){const row=arr.find(r=>r.student_id===student_id);return row?row[field]:'';}
  res.send(layout(`Class ${klass.class_date}`, `<form method="post" action="/classes/${klass.id}/mark"><table border=1><tr><th>Student</th><th>Attendance</th><th>Homework</th></tr>${students.map(s=>`<tr><td>${s.name}</td><td><select name="att_${s.id}"><option value="present" ${getStatus(attendance,s.id,'status')==='present'?'selected':''}>Present</option><option value="absent" ${getStatus(attendance,s.id,'status')==='absent'?'selected':''}>Absent</option></select></td><td><select name="hw_${s.id}"><option value="1" ${getStatus(homework,s.id,'delivered')==1?'selected':''}>Delivered</option><option value="0" ${getStatus(homework,s.id,'delivered')==0?'selected':''}>Not delivered</option></select></td></tr>`).join('')}</table><button>Save</button></form>`, req.session.user));
});

app.post('/classes/:id/mark', requireAuth,(req,res)=>{
  const klass = db.prepare(`SELECT c.* FROM classes c JOIN groups g ON c.group_id=g.id WHERE c.id=? AND g.owner_id=?`).get(req.params.id, req.session.user.id);
  if(!klass) return res.send('Not found or not yours');
  const students = db.prepare('SELECT * FROM students WHERE group_id=?').all(klass.group_id);
  const attStmt=db.prepare('INSERT OR REPLACE INTO attendance (class_id,student_id,status) VALUES (?,?,?)');
  const hwStmt=db.prepare('INSERT OR REPLACE INTO homework (class_id,student_id,delivered) VALUES (?,?,?)');
  for(const s of students){
    const att=req.body[`att_${s.id}`];
    const hw=req.body[`hw_${s.id}`];
    if(att) attStmt.run(klass.id,s.id,att);
    if(hw!==undefined) hwStmt.run(klass.id,s.id,Number(hw));
  }
  checkNotifications(req.session.user.email,klass.group_id,students);
  res.redirect(`/classes/${klass.id}`);
});

// --- Notification logic ---
function getStudentHistory(group_id,student_id){
  return db.prepare(`SELECT c.id as class_id,c.class_date,a.status,h.delivered FROM classes c LEFT JOIN attendance a ON a.class_id=c.id AND a.student_id=? LEFT JOIN homework h ON h.class_id=c.id AND h.student_id=? WHERE c.group_id=? ORDER BY c.class_date ASC`).all(student_id,student_id,group_id);
}

function checkNotifications(email,group_id,students){
  for(const s of students){
    const history=getStudentHistory(group_id,s.id);
    let absentStreak=0;let hwMissStreak=0;
    for(const row of history){
      if(row.status==='absent'){ absentStreak++; hwMissStreak=0; } else { absentStreak=0; if(row.delivered===0){ hwMissStreak++; } else { hwMissStreak=0; } }
      if(absentStreak===2){ sendNotificationEmail(email,'Absence Alert',`${s.name} missed two classes in a row (latest: ${row.class_date})`); break; }
      if(hwMissStreak===2){ sendNotificationEmail(email,'Homework Alert',`${s.name} missed homework twice in a row (latest: ${row.class_date})`); break; }
    }
  }
}

async function sendNotificationEmail(to, subject, text) {
  return mailer.sendMail({from:EMAIL_FROM,to,subject,text});
}

app.listen(PORT,()=>console.log('Running on http://localhost:'+PORT));
