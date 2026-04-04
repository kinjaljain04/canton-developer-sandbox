import request from 'supertest';
import app from '../faucet/server';

describe('Faucet API', () => {
  const partyId = 'TestParty::abc123';

  it('returns 200 on valid claim', async () => {
    const res = await request(app)
      .post('/faucet/claim')
      .send({ partyId });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('rate-limits after first claim', async () => {
    await request(app).post('/faucet/claim').send({ partyId });
    const res = await request(app).post('/faucet/claim').send({ partyId });
    expect(res.status).toBe(429);
  });

  it('rejects missing partyId', async () => {
    const res = await request(app).post('/faucet/claim').send({});
    expect(res.status).toBe(400);
  });
});
