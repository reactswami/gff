/* The order of these arrays will determine which colour gets chosen for different tags */
const TAG_COLORS = [
  '#BA43A9',
  '#705DA0',
  '#447EBC',
  '#757575',
  '#0A437C', // Meraki
  '#6D1F62',
  '#584477',
  '#2F4F4F',
  '#806EB7',
  '#8a2eb8',
  '#000000',
  '#2F575E',
  '#0E4AB4',
  '#58140C',
  '#1F78C1', // statseeker
  '#052B51',
  '#511749',
  '#3F2B5B',
];

const TAG_BORDER_COLORS = [
  '#E069CF',
  '#9683C6',
  '#6AA4E2',
  '#9B9B9B',
  '#3069A2',
  '#934588',
  '#7E6A9D',
  '#557575',
  '#A694DD',
  '#B054DE',
  '#262626',
  '#557D84',
  '#3470DA',
  '#7E3A32',
  '#459EE7',
  '#2B5177',
  '#773D6F',
  '#655181',
];

/**
 * Returns tag badge background and border colors based on hashed tag name.
 *
 * @param name tag name
 */
export function getTagColorsFromName(name: string): { color: string; borderColor: string } {
  const hash = djb2(name.toLowerCase());
  const color = TAG_COLORS[Math.abs(hash % TAG_COLORS.length)];
  const borderColor = TAG_BORDER_COLORS[Math.abs(hash % TAG_BORDER_COLORS.length)];
  return { color, borderColor };
}

function djb2(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i); /* hash * 33 + c */
  }
  return hash;
}

export default {
  getTagColorsFromName,
};
