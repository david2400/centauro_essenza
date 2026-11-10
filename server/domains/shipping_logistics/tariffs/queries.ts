import 'server-only';

import { tariffs_repository } from './repository';

export const list_rate_cards = () => tariffs_repository.cards();
export const list_tariff_zones = () => tariffs_repository.zones();
export const list_coverage_gaps = () => tariffs_repository.gaps();
