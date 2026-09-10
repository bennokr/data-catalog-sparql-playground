export function registerYasrPlugins({ includeSparnaturalPlugins }) {
  const Yasr = window.Yasr || window.Yasgui?.Yasr;
  if (!Yasr) return;

  const baseOrder = Yasr.defaults.pluginOrder || ['table', 'response'];
  if (!includeSparnaturalPlugins || !window.SparnaturalYasguiPlugins) {
    Yasr.defaults.pluginOrder = Array.from(new Set(baseOrder.filter(Boolean)));
    Yasr.defaults.defaultPlugin = Yasr.defaults.pluginOrder[0] || 'table';
    return;
  }

  Yasr.registerPlugin('TableX', window.SparnaturalYasguiPlugins.TableX);
  Yasr.registerPlugin('Grid', window.SparnaturalYasguiPlugins.GridPlugin);
  Yasr.registerPlugin('Stats', window.SparnaturalYasguiPlugins.StatsPlugin);
  Yasr.registerPlugin('Map', window.SparnaturalYasguiPlugins.MapPlugin);

  const customNames = ['TableX', 'Grid', 'Stats', 'Map'];
  Yasr.defaults.pluginOrder = customNames.concat(
    baseOrder.filter((name) => name !== 'table' && !customNames.includes(name)),
  );
  Yasr.defaults.defaultPlugin = 'TableX';
}
