export type DashboardMockData = {
  kpis: {
    totalStores: number;
    okStores: number;
    divergentStores: number;
    storesWithoutData: number;
  };
  previousKpis: {
    totalStores: number;
    okStores: number;
    divergentStores: number;
    storesWithoutData: number;
  };
  statuses: {
    ok: number;
    goldDelayed: number;
    silverDelayed: number;
    apiDelayed: number;
    noData: number;
  };
  gauge: {
    totalStores: number;
    okStores: number;
  };
  delayedStores: {
    id: string;
    associationCode: string;
    farmaCode: string;
    cnpj: string;
    pharmacyName: string;
    lastUpdatedAt: string;
    delayHours: number;
    problemLayers: ('Gold' | 'Silver' | 'API' | 'Sem dados')[];
    lastSalesByLayer?: Partial<Record<'Gold' | 'Silver' | 'API' | 'Sem dados', string>>;
  }[];
};

export const DASHBOARD_MOCK_DATA: DashboardMockData = {
  kpis: {
    totalStores: 3840,
    okStores: 3605,
    divergentStores: 196,
    storesWithoutData: 52,
  },
  previousKpis: {
    totalStores: 3820,
    okStores: 3580,
    divergentStores: 210,
    storesWithoutData: 60,
  },
  statuses: {
    ok: 3605,
    goldDelayed: 80,
    silverDelayed: 60,
    apiDelayed: 56,
    noData: 52,
  },
  gauge: {
    totalStores: 3840,
    okStores: 3605,
  },
  delayedStores: [
    {
      id: 'loj-047',
      associationCode: '1001',
      farmaCode: '047',
      cnpj: '12.345.678/0001-90',
      pharmacyName: 'Farma Centro',
      lastUpdatedAt: '16/04/2026 01:10',
      delayHours: 84,
      problemLayers: ['API', 'Gold'],
      lastSalesByLayer: {
        API: '12/04/2026 21:05',
        Gold: '12/04/2026 20:42',
      },
    },
    {
      id: 'loj-102',
      associationCode: '1001',
      farmaCode: '102',
      cnpj: '98.765.432/0001-01',
      pharmacyName: 'Farma Paulista',
      lastUpdatedAt: '16/04/2026 03:35',
      delayHours: 76,
      problemLayers: ['Gold'],
      lastSalesByLayer: {
        Gold: '13/04/2026 02:18',
      },
    },
    {
      id: 'loj-015',
      associationCode: '1002',
      farmaCode: '015',
      cnpj: '45.332.110/0001-77',
      pharmacyName: 'Farma Moema',
      lastUpdatedAt: '16/04/2026 08:25',
      delayHours: 58,
      problemLayers: ['Silver', 'API'],
      lastSalesByLayer: {
        Silver: '13/04/2026 22:40',
        API: '13/04/2026 21:56',
      },
    },
    {
      id: 'loj-233',
      associationCode: '1003',
      farmaCode: '233',
      cnpj: '01.123.987/0001-40',
      pharmacyName: 'Farma Tatuapé',
      lastUpdatedAt: '16/04/2026 10:12',
      delayHours: 49,
      problemLayers: ['API'],
      lastSalesByLayer: {
        API: '14/04/2026 09:22',
      },
    },
    {
      id: 'loj-321',
      associationCode: '1002',
      farmaCode: '321',
      cnpj: '20.998.345/0001-66',
      pharmacyName: 'Farma Pinheiros',
      lastUpdatedAt: '16/04/2026 13:02',
      delayHours: 39,
      problemLayers: ['Gold', 'Silver'],
      lastSalesByLayer: {
        Gold: '14/04/2026 21:03',
        Silver: '14/04/2026 20:51',
      },
    },
    {
      id: 'loj-404',
      associationCode: '1004',
      farmaCode: '404',
      cnpj: '55.444.333/0001-22',
      pharmacyName: 'Farma Guarulhos',
      lastUpdatedAt: '15/04/2026 22:00',
      delayHours: 0,
      problemLayers: ['Sem dados'],
      lastSalesByLayer: {
        'Sem dados': 'Sem recebimento de vendas',
      },
    },
    {
      id: 'loj-118',
      associationCode: '1001',
      farmaCode: '118',
      cnpj: '33.222.111/0001-55',
      pharmacyName: 'Farma Santana',
      lastUpdatedAt: '16/04/2026 02:42',
      delayHours: 72,
      problemLayers: ['Gold', 'API'],
      lastSalesByLayer: {
        Gold: '13/04/2026 05:44',
        API: '13/04/2026 05:16',
      },
    },
    {
      id: 'loj-207',
      associationCode: '1003',
      farmaCode: '207',
      cnpj: '76.440.219/0001-18',
      pharmacyName: 'Farma Vila Mariana',
      lastUpdatedAt: '16/04/2026 05:10',
      delayHours: 66,
      problemLayers: ['Silver'],
      lastSalesByLayer: {
        Silver: '13/04/2026 10:01',
      },
    },
    {
      id: 'loj-289',
      associationCode: '1005',
      farmaCode: '289',
      cnpj: '19.330.882/0001-61',
      pharmacyName: 'Farma Santo Amaro',
      lastUpdatedAt: '16/04/2026 06:28',
      delayHours: 61,
      problemLayers: ['API'],
      lastSalesByLayer: {
        API: '13/04/2026 17:33',
      },
    },
    {
      id: 'loj-311',
      associationCode: '1005',
      farmaCode: '311',
      cnpj: '44.780.002/0001-96',
      pharmacyName: 'Farma Itaquera',
      lastUpdatedAt: '16/04/2026 07:05',
      delayHours: 57,
      problemLayers: ['Gold', 'Silver'],
      lastSalesByLayer: {
        Gold: '13/04/2026 22:14',
        Silver: '13/04/2026 21:48',
      },
    },
    {
      id: 'loj-356',
      associationCode: '1006',
      farmaCode: '356',
      cnpj: '88.120.340/0001-27',
      pharmacyName: 'Farma Osasco',
      lastUpdatedAt: '16/04/2026 09:44',
      delayHours: 52,
      problemLayers: ['Silver', 'API'],
      lastSalesByLayer: {
        Silver: '14/04/2026 06:57',
        API: '14/04/2026 06:31',
      },
    },
    {
      id: 'loj-412',
      associationCode: '1006',
      farmaCode: '412',
      cnpj: '72.500.610/0001-88',
      pharmacyName: 'Farma São Bernardo',
      lastUpdatedAt: '16/04/2026 11:20',
      delayHours: 46,
      problemLayers: ['Gold'],
      lastSalesByLayer: {
        Gold: '14/04/2026 13:09',
      },
    },
    {
      id: 'loj-455',
      associationCode: '1007',
      farmaCode: '455',
      cnpj: '53.009.774/0001-08',
      pharmacyName: 'Farma Sorocaba',
      lastUpdatedAt: '16/04/2026 12:56',
      delayHours: 41,
      problemLayers: ['API', 'Sem dados'],
      lastSalesByLayer: {
        API: '14/04/2026 20:35',
        'Sem dados': 'Sem recebimento de vendas',
      },
    },
    {
      id: 'loj-501',
      associationCode: '1007',
      farmaCode: '501',
      cnpj: '60.771.450/0001-35',
      pharmacyName: 'Farma Campinas',
      lastUpdatedAt: '16/04/2026 14:33',
      delayHours: 37,
      problemLayers: ['Silver'],
      lastSalesByLayer: {
        Silver: '15/04/2026 01:18',
      },
    },
    {
      id: 'loj-544',
      associationCode: '1008',
      farmaCode: '544',
      cnpj: '29.660.143/0001-75',
      pharmacyName: 'Farma Jundiaí',
      lastUpdatedAt: '16/04/2026 15:08',
      delayHours: 31,
      problemLayers: ['Gold', 'API'],
      lastSalesByLayer: {
        Gold: '15/04/2026 08:40',
        API: '15/04/2026 08:21',
      },
    },
    {
      id: 'loj-588',
      associationCode: '1008',
      farmaCode: '588',
      cnpj: '15.204.997/0001-49',
      pharmacyName: 'Farma Ribeirão',
      lastUpdatedAt: '16/04/2026 16:20',
      delayHours: 24,
      problemLayers: ['Sem dados'],
      lastSalesByLayer: {
        'Sem dados': 'Sem recebimento de vendas',
      },
    },
    {
      id: 'loj-601',
      associationCode: '1009',
      farmaCode: '601',
      cnpj: '40.114.221/0001-62',
      pharmacyName: 'Farma Bauru',
      lastUpdatedAt: '16/04/2026 17:05',
      delayHours: 0,
      problemLayers: [],
    },
    {
      id: 'loj-619',
      associationCode: '1009',
      farmaCode: '619',
      cnpj: '25.318.900/0001-17',
      pharmacyName: 'Farma Piracicaba',
      lastUpdatedAt: '16/04/2026 17:12',
      delayHours: 0,
      problemLayers: [],
    },
    {
      id: 'loj-633',
      associationCode: '1010',
      farmaCode: '633',
      cnpj: '17.422.639/0001-03',
      pharmacyName: 'Farma São José',
      lastUpdatedAt: '16/04/2026 17:26',
      delayHours: 0,
      problemLayers: [],
    },
    {
      id: 'loj-648',
      associationCode: '1011',
      farmaCode: '648',
      cnpj: '09.287.514/0001-71',
      pharmacyName: 'Farma Praia Grande',
      lastUpdatedAt: '16/04/2026 17:31',
      delayHours: 0,
      problemLayers: [],
    },
    {
      id: 'loj-672',
      associationCode: '1012',
      farmaCode: '672',
      cnpj: '67.901.223/0001-45',
      pharmacyName: 'Farma Santos',
      lastUpdatedAt: '16/04/2026 17:44',
      delayHours: 0,
      problemLayers: [],
    },
  ],
};
