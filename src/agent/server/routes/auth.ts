import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { DatabaseService } from '../../../server/services/databaseService';
import { JwtService } from '../services/jwtService';

export const agentAuthRouter = Router();

// Exchange one-time enroll token for access and refresh secrets
agentAuthRouter.post('/enroll', async (req, res) => {
  const { agentId, enrollToken } = req.body || {};
  if (!agentId || !enrollToken) return res.status(400).json({ error: 'Missing agentId or enrollToken' });
  const secrets = await DatabaseService.getAgentSecrets(agentId);
  if (!secrets?.enroll_secret_hash) return res.status(400).json({ error: 'Not enrolled or already used' });
  const ok = await bcrypt.compare(enrollToken, secrets.enroll_secret_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid enrollment token' });

  // Invalidate enroll token by clearing hash
  await DatabaseService.upsertAgentSecrets(agentId, '', null);

  // Issue short-lived access token and a refresh secret (hashed at rest)
  const accessToken = JwtService.issueAccessToken(agentId, 15);
  const refreshSecret = cryptoRandom();
  const refreshHash = await bcrypt.hash(refreshSecret, 10);
  await DatabaseService.upsertAgentSecrets(agentId, null, refreshHash);
  await DatabaseService.setAgentStatus(agentId, 'offline');

  res.json({ accessToken, refreshSecret, tokenType: 'Bearer', expiresInSeconds: 15 * 60 });
});

// Exchange refresh secret for a new access token
agentAuthRouter.post('/token', async (req, res) => {
  const { agentId, refreshSecret } = req.body || {};
  if (!agentId || !refreshSecret) return res.status(400).json({ error: 'Missing agentId or refreshSecret' });
  const secrets = await DatabaseService.getAgentSecrets(agentId);
  if (!secrets?.refresh_secret_hash) return res.status(401).json({ error: 'No refresh secret on file' });
  const ok = await bcrypt.compare(refreshSecret, secrets.refresh_secret_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid refresh secret' });
  const accessToken = JwtService.issueAccessToken(agentId, 15);
  res.json({ accessToken, tokenType: 'Bearer', expiresInSeconds: 15 * 60 });
});

function cryptoRandom() {
  const arr = new Uint8Array(32);
  for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  return Buffer.from(arr).toString('hex');
}










