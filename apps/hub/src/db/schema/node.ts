import type { EntityDefinition } from 'supersave';

export const nodeEntity: EntityDefinition = {
  name: 'nodes',
  template: {},
  relations: [],
  filterSortFields: { node_id: 'string', name: 'string' },
};
