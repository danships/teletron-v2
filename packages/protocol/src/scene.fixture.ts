export const scene = {
  target: 'web',
  theme: 'dark',
  grid: { rows: 1, columns: 3, gap: 'small', padding: 'medium' },
  modules: [
    {
      id: 'clock',
      mode: 'local',
      placement: { row: 1, column: 1, rowSpan: 1, columnSpan: 1 },
      component: {
        type: 'text',
        value: { type: 'clock', format: 'HH:mm' },
        size: 'hero',
        weight: 'bold',
        tone: 'default',
      },
    },
    {
      id: 'weather',
      mode: 'data',
      source: 'weather.home',
      placement: { row: 1, column: 2, rowSpan: 1, columnSpan: 1 },
      component: {
        type: 'stack',
        direction: 'column',
        alignment: 'center',
        gap: 'small',
        children: [
          { type: 'icon', value: { type: 'literal', value: 'weather-clear' } },
          {
            type: 'big-number',
            value: { type: 'data', path: 'temperature.current' },
            size: 'large',
            weight: 'regular',
            tone: 'accent',
          },
        ],
      },
    },
    {
      id: 'followers',
      mode: 'data',
      source: 'youtube.followers',
      placement: { row: 1, column: 3, rowSpan: 1, columnSpan: 1 },
      component: {
        type: 'text',
        value: { type: 'literal', value: '<script>text</script>' },
        size: 'small',
        weight: 'regular',
        tone: 'muted',
      },
    },
  ],
};
