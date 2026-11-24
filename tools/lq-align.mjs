/*
 * Line the strings of two lessons up with one another.
 *
 * Take the wording out of both lessons and leave a mark where each
 * string stood, and the two shapes are the same, for the wording a
 * reader sees was given a Chinese but the shape of the program was
 * not touched.  Read the two shapes side by side and the strings
 * stand in the same places, one for one.
 */
import { skeletonOf } from './lq-skeleton.mjs';

/* The parts of a lesson that stand between its strings. */
const partsOf = (shape) => {
  const marks = [];
  for (let i = 0; i < shape.lit.length; i++) {
    if (shape.lit[i]) marks.push(i);
  }
  const parts = [];
  let pos = 0;
  for (const at of marks) {
    parts.push(shape.shape.slice(pos, at));
    pos = at + 1;
  }
  parts.push(shape.shape.slice(pos));
  return { parts, marks };
};

/*
 * The strings of the older lesson and the strings of the newer one,
 * each with the string it stands against.
 *
 * The answer is nothing when the two lessons do not have the same
 * shape, for then the strings cannot be trusted to stand in the same
 * places.
 */
export const alignLiterals = (oldText, newText, kind, options) => {
  const oldShape = skeletonOf(oldText, kind, options);
  const newShape = skeletonOf(newText, kind, options);
  const oldParts = partsOf(oldShape);
  const newParts = partsOf(newShape);
  if (oldParts.marks.length !== newParts.marks.length) return null;

  const pairs = [];
  for (let i = 0; i < oldParts.marks.length; i++) {
    if (oldParts.parts[i] !== newParts.parts[i]) return null;
    pairs.push({
      old: oldShape.lit[oldParts.marks[i]],
      now: newShape.lit[newParts.marks[i]]
    });
  }
  if (oldParts.parts[oldParts.parts.length - 1] !== newParts.parts[newParts.parts.length - 1]) {
    return null;
  }
  return pairs;
};

export default alignLiterals;
