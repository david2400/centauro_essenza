import 'server-only';

import { cache } from 'react';

import { order_devolution_evidences_repository } from './repository';

export const list_order_devolution_evidences = cache(async () => {
  return order_devolution_evidences_repository.list_order_devolution_evidences();
});

export const list_evidences_of_devolution = cache(async (devolution_id: number) => {
  return order_devolution_evidences_repository.list_by_devolution(devolution_id);
});

export const get_order_devolution_evidence_by_id = cache(async ({ id }: { id: number }) => {
  return order_devolution_evidences_repository.get_order_devolution_evidence_by_id(id);
});
