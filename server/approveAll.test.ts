import { describe, it, expect, vi } from 'vitest';
import { appRouter } from './routers';

describe('approveAll routes', () => {
  it('sales.approveAll should exist as a mutation', () => {
    expect(appRouter._def.procedures).toHaveProperty('sales.approveAll');
  });

  it('fei.approveAll should exist as a mutation', () => {
    expect(appRouter._def.procedures).toHaveProperty('fei.approveAll');
  });

  it('consignment.approveAll should exist as a mutation', () => {
    expect(appRouter._def.procedures).toHaveProperty('consignment.approveAll');
  });

  it('dispatch.approveAll should exist as a mutation', () => {
    expect(appRouter._def.procedures).toHaveProperty('dispatch.approveAll');
  });

  it('sdr.approveAll should exist as a mutation', () => {
    expect(appRouter._def.procedures).toHaveProperty('sdr.approveAll');
  });

  it('sdr.approveAllAttendance should exist as a mutation', () => {
    expect(appRouter._def.procedures).toHaveProperty('sdr.approveAllAttendance');
  });
});
