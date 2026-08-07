import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

dotenv.config();
const app = express();
const secret = process.env.AUTH_SECRET || 'change-this-development-secret';
const mongoUri = process.env.MONGODB_URI;
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '5mb' }));
const userSchema = new mongoose.Schema({ email: { type: String, unique: true, lowercase: true }, password: String, role: { type: String, default: 'student' }, teamId: String, teamName: String, memberName: String });
const teamSchema = new mongoose.Schema({ teamId: { type: String, unique: true }, teamName: String, college: String, members: Array, status: { type: String, default: 'Registered' } }, { timestamps: true });
const announcementSchema = new mongoose.Schema({ text: String, attachment: mongoose.Schema.Types.Mixed, author: String, date: { type: Date, default: Date.now } });
const User = mongoose.model('User', userSchema); const Team = mongoose.model('Team', teamSchema); const Announcement = mongoose.model('Announcement', announcementSchema);
const publicUser = (u) => ({ id: u._id.toString(), email: u.email, role: u.role, teamId: u.teamId, teamName: u.teamName, memberName: u.memberName });
const makeToken = (u) => { const p = Buffer.from(JSON.stringify({ sub: u._id.toString(), exp: Date.now() + 604800000 })).toString('base64url'); return `${p}.${crypto.createHmac('sha256', secret).update(p).digest('base64url')}`; };
const isBcryptHash = (value) => typeof value === 'string' && /^\$2[aby]\$/i.test(value);
const verifyPassword = async (candidate, stored) => { if (!stored) return false; if (isBcryptHash(stored)) return bcrypt.compare(candidate, stored); return candidate === stored; };
const auth = async (req, res, next) => { try { const [p, s] = (req.headers.authorization?.replace(/^Bearer\s+/i, '') || '').split('.'); if (!p || s !== crypto.createHmac('sha256', secret).update(p).digest('base64url')) throw Error(); const d = JSON.parse(Buffer.from(p, 'base64url').toString()); if (d.exp < Date.now()) throw Error(); req.user = await User.findById(d.sub); if (!req.user) throw Error(); next(); } catch { res.status(401).json({ message: 'Invalid or expired authentication token.' }); } };
const admin = (req, res, next) => req.user?.role === 'admin' ? next() : res.status(403).json({ message: 'Administrator access required.' });
app.get('/api/health', (req, res) => res.json({ status: 'Server is running', mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected' }));
app.post('/api/auth/register', async (req, res, next) => { try { const { teamName, college, password, members } = req.body; if (!teamName || !college || !password || !Array.isArray(members) || members.length !== 3) return res.status(400).json({ message: 'Complete registration details are required.' }); const normalized = members.map((m, i) => ({ ...m, email: m.email.trim().toLowerCase(), isTeamHead: i === 0 })); if (new Set(normalized.map(m => m.email)).size !== 3 || await User.findOne({ email: normalized[0].email })) return res.status(409).json({ message: 'Member email already registered.' }); const team = await Team.create({ teamId: `TEAM-${Date.now().toString(36).toUpperCase()}`, teamName, college, members: normalized }); const users = await User.insertMany(normalized.map(m => ({ email: m.email, password: bcrypt.hashSync(password, 10), teamId: team.teamId, teamName, memberName: m.name }))); res.status(201).json({ token: makeToken(users[0]), user: publicUser(users[0]) }); } catch (e) { next(e); } });
app.post('/api/auth/login', async (req, res, next) => { try { const u = await User.findOne({ email: req.body.email?.trim().toLowerCase() }); if (!u || !(await verifyPassword(req.body.password || '', u.password))) return res.status(401).json({ message: 'Invalid email or password.' }); res.json({ token: makeToken(u), user: publicUser(u) }); } catch (e) { next(e); } });
app.get('/api/announcements', auth, async (req, res, next) => { try { res.json(await Announcement.find().sort({ date: -1 })); } catch (e) { next(e); } });
app.post('/api/announcements', auth, admin, async (req, res, next) => { try { res.status(201).json(await Announcement.create({ ...req.body, author: req.user.email })); } catch (e) { next(e); } });
app.put('/api/announcements/:id', auth, admin, async (req, res, next) => { try { res.json(await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (e) { next(e); } });
app.delete('/api/announcements/:id', auth, admin, async (req, res, next) => { try { await Announcement.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); } catch (e) { next(e); } });
app.get('/api/teams', auth, admin, async (req, res, next) => { try { res.json(await Team.find().sort({ createdAt: -1 })); } catch (e) { next(e); } });
app.delete('/api/teams/:teamId', auth, admin, async (req, res, next) => { try { await Team.findOneAndDelete({ teamId: req.params.teamId }); await User.deleteMany({ teamId: req.params.teamId }); res.json({ message: 'Deleted' }); } catch (e) { next(e); } });
app.use((e, req, res, next) => { console.error(e); res.status(500).json({ message: 'Internal server error.' }); });
if (!mongoUri) {
  console.error('Missing MONGODB_URI. Create a .env file and set your MongoDB connection string.');
  process.exit(1);
}

mongoose.connect(mongoUri).then(async () => { for (const email of ['sandeeptrangarajan@gmail.com', 'yogabalan2007yoga@gmail.com']) { const existing = await User.findOne({ email }); if (!existing) { await User.create({ email, password: bcrypt.hashSync('Admin@ksrce', 10), role: 'admin' }); continue; } if (existing.password && !isBcryptHash(existing.password)) { existing.password = bcrypt.hashSync('Admin@ksrce', 10); await existing.save(); } } app.listen(process.env.PORT || 5000, () => console.log('MongoDB API running')); }).catch((e) => { console.error('MongoDB connection failed:', e.message); process.exit(1); });
