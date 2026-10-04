export const SEASONS = [
  {month: 'march', label: 'March', number: '03', stage: 'Winter maximum', window: 'Winter · ice builds toward March', description: 'Arctic-wide ice extent usually peaks in March. This snapshot shows late-winter coverage; individual Canadian waters peak at different times.'},
  {month: 'july', label: 'July', number: '07', stage: 'Melting & breakup', window: 'June–August · retreating ice', description: 'Ice retreats through spring and summer. July samples the breakup period; channels and port approaches can still contain ice.'},
  {month: 'september', label: 'September', number: '09', stage: 'Annual minimum', window: 'Late summer · typically September', description: 'Arctic-wide ice extent usually reaches its minimum in September. Compare this key late-season shipping snapshot across years; minimum ice does not mean every route is clear.'},
  {month: 'october', label: 'October', number: '10', stage: 'Freeze-up', window: 'Autumn · ice begins returning', description: 'October samples autumn ice growth. Freeze-up can begin in September in northern waters and extend into December elsewhere.'},
] as const
export type IceMonth = typeof SEASONS[number]['month']
