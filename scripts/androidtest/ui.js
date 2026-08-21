/**
 * Reading the Android screen through adb.
 *
 * uiautomator dumps the live view hierarchy as XML. Two things make it valuable
 * here: `text` shows what a sighted person reads, and `content-desc` is exactly
 * what TalkBack announces — so the accessibility labels added to the icon-only
 * buttons can be checked on a real screen rather than inferred from source.
 */

/** Parse a uiautomator XML dump into a flat list of nodes. */
function parseDump(xml) {
  const nodes = [];
  if (!xml) return nodes;
  let i = 0;
  while ((i = xml.indexOf('<node ', i)) !== -1) {
    const end = xml.indexOf('>', i);
    if (end === -1) break;
    const tag = xml.slice(i, end);
    i = end + 1;
    const attr = (name) => {
      const marker = ' ' + name + '="';
      const at = tag.indexOf(marker);
      if (at === -1) return '';
      const s = at + marker.length;
      const e = tag.indexOf('"', s);
      return e === -1 ? '' : tag.slice(s, e);
    };
    const bounds = attr('bounds');
    let box = null;
    // bounds look like [left,top][right,bottom]
    const nums = bounds.split(/[^0-9]+/).filter(Boolean).map(Number);
    if (nums.length === 4) {
      box = { left: nums[0], top: nums[1], right: nums[2], bottom: nums[3] };
      box.cx = Math.round((box.left + box.right) / 2);
      box.cy = Math.round((box.top + box.bottom) / 2);
      box.w = box.right - box.left;
      box.h = box.bottom - box.top;
    }
    nodes.push({
      text: attr('text'),
      desc: attr('content-desc'),
      cls: attr('class'),
      clickable: attr('clickable') === 'true',
      box,
    });
  }
  return nodes;
}

/** All visible text on screen, joined. */
function screenText(nodes) {
  return nodes.map(n => n.text).filter(Boolean).join('\n');
}

/** Find a tappable node by its visible text or its announced description. */
function findTappable(nodes, needle) {
  const hit = nodes.find(n =>
    (n.text && n.text.includes(needle)) || (n.desc && n.desc.includes(needle))
  );
  if (!hit) return null;
  if (hit.clickable || !hit.box) return hit;
  // The text is often a child of the actual button; take the nearest clickable
  // node whose box contains this one.
  const container = nodes.find(n =>
    n.clickable && n.box && hit.box &&
    n.box.left <= hit.box.left && n.box.right >= hit.box.right &&
    n.box.top <= hit.box.top && n.box.bottom >= hit.box.bottom
  );
  return container || hit;
}

/**
 * Controls that a screen reader would announce as nothing useful.
 *
 * A clickable node with no text of its own and no content-desc is the runtime
 * form of the "announces only button" defect: TalkBack reads the role and
 * stops. Small square boxes are the icon-only buttons specifically.
 */
function unlabelledControls(nodes) {
  return nodes.filter(n =>
    n.clickable && !n.text.trim() && !n.desc.trim() &&
    n.box && n.box.w > 0 && n.box.h > 0 &&
    n.box.w < 200 && n.box.h < 200
  );
}

/** Touch targets smaller than Android's 48dp guidance, in pixels at the given density. */
function smallTargets(nodes, density = 1) {
  const min = 48 * density;
  return nodes.filter(n => n.clickable && n.box && (n.box.w < min || n.box.h < min));
}

module.exports = { parseDump, screenText, findTappable, unlabelledControls, smallTargets };
