/**
 * Reading the Android screen (the parsing half of the runtime harness).
 *
 * The harness itself cannot run on this machine — virtualisation is disabled in
 * firmware, so no x86_64 emulator can start. What CAN be proven here is the
 * part that decides what the screen says: if this parsing is wrong, the runtime
 * run would report confident nonsense the moment a device is plugged in.
 *
 * `content-desc` is what TalkBack actually announces, so these tests also cover
 * how the accessibility check will read a real screen.
 */

const { parseDump, screenText, findTappable, unlabelledControls, smallTargets } =
  require('../../scripts/androidtest/ui.js');

/** One node from a uiautomator dump. The harness is plain JS; this names its shape. */
interface UiNode {
  text: string;
  desc: string;
  cls: string;
  clickable: boolean;
  box: { left: number; top: number; right: number; bottom: number; cx: number; cy: number; w: number; h: number } | null;
}

const DUMP = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<hierarchy rotation="0">',
  '  <node text="Safe to Spend" content-desc="" class="android.widget.TextView" clickable="false" bounds="[40,300][680,360]" />',
  '  <node text="$3,380.71" content-desc="" class="android.widget.TextView" clickable="false" bounds="[40,370][680,460]" />',
  '  <node text="" content-desc="Go back" class="android.view.ViewGroup" clickable="true" bounds="[20,80][164,224]" />',
  '  <node text="" content-desc="Notifications and settings" class="android.view.ViewGroup" clickable="true" bounds="[900,80][1044,224]" />',
  '  <node text="" content-desc="" class="android.view.ViewGroup" clickable="true" bounds="[500,80][560,140]" />',
  '  <node text="Add Expense" content-desc="" class="android.widget.TextView" clickable="false" bounds="[60,600][300,650]" />',
  '  <node text="" content-desc="" class="android.view.ViewGroup" clickable="true" bounds="[40,560][320,700]" />',
  '</hierarchy>',
].join('\n');

describe('Parsing a uiautomator dump', () => {
  const nodes: UiNode[] = parseDump(DUMP);

  it('finds every node', () => {
    expect(nodes).toHaveLength(7);
  });

  it('reads the text a sighted person sees', () => {
    expect(screenText(nodes)).toContain('Safe to Spend');
    expect(screenText(nodes)).toContain('$3,380.71');
  });

  it('reads content-desc, which is what a screen reader announces', () => {
    const descs = nodes.map((n: UiNode) => n.desc).filter(Boolean);
    expect(descs).toContain('Go back');
    expect(descs).toContain('Notifications and settings');
  });

  it('turns bounds into a tappable point', () => {
    const back: UiNode = findTappable(nodes, 'Go back');
    expect(back.box!.cx).toBe(92);
    expect(back.box!.cy).toBe(152);
  });

  it('taps the BUTTON, not the label inside it', () => {
    // "Add Expense" is a text node; the clickable container wraps it.
    const target: UiNode = findTappable(nodes, 'Add Expense');
    expect(target.clickable).toBe(true);
    expect(target.box!.left).toBe(40);
    expect(target.box!.right).toBe(320);
  });

  it('returns null rather than guessing when nothing matches', () => {
    expect(findTappable(nodes, 'Nonexistent Button')).toBeNull();
  });

  it('spots a control a screen reader would announce as nothing', () => {
    // The 60x60 node has neither text nor description: TalkBack says "button".
    const bad: UiNode[] = unlabelledControls(nodes);
    expect(bad).toHaveLength(1);
    expect(bad[0].box!.left).toBe(500);
  });

  it('does not flag a control that has a description', () => {
    expect(unlabelledControls(nodes).some((n: UiNode) => n.desc === 'Go back')).toBe(false);
  });

  it('measures touch targets against the 48dp guidance', () => {
    // A dump is in PIXELS, so the 48dp minimum has to be scaled by the screen
    // density before it means anything. On a 3x phone 48dp is 144px: the 144px
    // buttons are exactly on the line, the 60px icon is well under it.
    const small: UiNode[] = smallTargets(nodes, 3);
    const widths = small.map((n: UiNode) => n.box!.w);
    expect(widths).toContain(60);
    expect(small.some((n: UiNode) => n.desc === 'Go back')).toBe(false);   // 144px, on the line
  });

  it('survives an empty or malformed dump instead of throwing', () => {
    expect(parseDump('')).toEqual([]);
    expect(parseDump('<hierarchy>')).toEqual([]);
    expect(parseDump('<node text="broken"')).toEqual([]);
  });
});
