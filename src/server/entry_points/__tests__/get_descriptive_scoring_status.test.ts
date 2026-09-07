import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as resultRepository from '../../repositories/result_repository';
import { getDescriptiveScoringStatus } from '../get_descriptive_scoring_status';

vi.mock('../../repositories/result_repository');

describe('getDescriptiveScoringStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('採点中マーカーが残っている場合はpendingを返す', () => {
    vi.mocked(resultRepository.isDescriptiveScoringPending).mockReturnValue(true);

    expect(getDescriptiveScoringStatus(5)).toBe('pending');
    expect(resultRepository.isDescriptiveScoringPending).toHaveBeenCalledWith(5);
  });

  test('採点中マーカーが残っていない場合はcompletedを返す', () => {
    vi.mocked(resultRepository.isDescriptiveScoringPending).mockReturnValue(false);

    expect(getDescriptiveScoringStatus(5)).toBe('completed');
  });
});
