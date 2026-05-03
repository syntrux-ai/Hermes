import { describe, expect, it } from 'vitest';
import { AssignmentService } from '../../../src/modules/voice-agents/booking-core/assignment.service.js';

describe('AssignmentService', () => {
  it('chooses the earliest slot and uses booking load as a tie-breaker', () => {
    const service = new AssignmentService();

    const selected = service.chooseRecommendedSlot(
      [
        { start_time: '14:00', end_time: '14:45', resource_id: 'b', resource_name: 'Riya' },
        { start_time: '14:00', end_time: '14:45', resource_id: 'a', resource_name: 'Priya' },
        { start_time: '13:30', end_time: '14:15', resource_id: 'c', resource_name: 'Kavya' },
      ],
      { a: 0, b: 3, c: 5 },
    );

    expect(selected?.resource_id).toBe('c');
  });

  it('chooses the least loaded resource when the requested time is fixed', () => {
    const service = new AssignmentService();

    const selected = service.chooseRecommendedSlot(
      [
        { start_time: '14:00', end_time: '14:45', resource_id: 'b', resource_name: 'Riya' },
        { start_time: '14:00', end_time: '14:45', resource_id: 'a', resource_name: 'Priya' },
      ],
      { a: 1, b: 0 },
      '14:00',
    );

    expect(selected?.resource_id).toBe('b');
  });
});
