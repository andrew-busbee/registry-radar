import { Router } from 'express';
import { JwtService } from '../services/jwtService';

export const jwksRouter = Router();

jwksRouter.get('/', (_req, res) => {
  res.json(JwtService.getJwks());
});


