import { FIELDER_SPOTS, type BaseId, type PositionId } from "../world/fieldLayout";

export interface Scenario {
  id: string;
  name: string;
  coachBefore: string;
  coachCorrect: string;
  coachPartial: string;
  coachWrong: string;
  hit: {
    kind: "grounder" | "fly" | "liner";
    target: { x: number; z: number };
    speed: number;
    launchAngle: number;
  };
  expected: {
    fieldedBy?: PositionId;
    cover?: PositionId;
    throwTo?: BaseId;
    catchFly?: boolean;
  };
}

function spot(pos: PositionId, towardHome = 6) {
  const s = FIELDER_SPOTS[pos];
  return { x: s.x, z: s.z + towardHome };
}

function between(a: PositionId, b: PositionId) {
  const A = FIELDER_SPOTS[a];
  const B = FIELDER_SPOTS[b];
  return { x: (A.x + B.x) / 2, z: (A.z + B.z) / 2 + 4 };
}

function grounderToFirst(
  id: string,
  name: string,
  coachBefore: string,
  target: { x: number; z: number },
  fieldedBy: PositionId,
  speed = 26,
): Scenario {
  return {
    id,
    name,
    coachBefore,
    coachCorrect: "Yes! Throw to first — that's the play with nobody on.",
    coachPartial: "You got the ball. First base is where the out is.",
    coachWrong: "The batter was running to first. Throw it there.",
    hit: { kind: "grounder", target, speed, launchAngle: 8 },
    expected: { fieldedBy, throwTo: "1B" },
  };
}

export const SCENARIOS: Scenario[] = [
  grounderToFirst(
    "gb-pitcher",
    "Grounder up the middle (pitcher)",
    "Up the middle! Pitcher fields it and goes to first.",
    spot("P", 4),
    "P",
    28,
  ),
  grounderToFirst(
    "gb-p-ss",
    "Grounder between pitcher and short",
    "In the hole between the pitcher and short. Get it and throw to first.",
    between("P", "SS"),
    "SS",
    27,
  ),
  grounderToFirst(
    "gb-ss",
    "Grounder to short",
    "Hit to short. Field it and throw to first.",
    spot("SS"),
    "SS",
    26,
  ),
  grounderToFirst(
    "gb-3-ss",
    "Grounder between third and short",
    "In the hole on the left side. Somebody get it to first.",
    between("3B", "SS"),
    "SS",
    25,
  ),
  grounderToFirst(
    "gb-3b",
    "Grounder to third",
    "Charged at third. Look the batter to first.",
    spot("3B", 5),
    "3B",
    24,
  ),
  grounderToFirst(
    "gb-p-2b",
    "Grounder between pitcher and second",
    "Right side, between the pitcher and second. Throw to first.",
    between("P", "2B"),
    "2B",
    27,
  ),
  grounderToFirst(
    "gb-2b",
    "Grounder to second",
    "Hit to second. Two to first.",
    spot("2B"),
    "2B",
    26,
  ),
  grounderToFirst(
    "gb-2-1",
    "Grounder between second and first",
    "In the hole on the right side. Get it to first.",
    between("2B", "1B"),
    "1B",
    25,
  ),
  {
    id: "force-at-second",
    name: "Grounder to short",
    coachBefore: "Grounder to short. Field it and work the force at second if there’s a runner there.",
    coachCorrect: "Force at second! Cover the bag and throw it there.",
    coachPartial: "Close — someone needed to cover second AND the ball had to get there.",
    coachWrong: "A grounder to short usually means second is the key force if the runner is on first.",
    hit: {
      kind: "grounder",
      target: spot("SS"),
      speed: 26,
      launchAngle: 8,
    },
    expected: { fieldedBy: "SS", cover: "2B", throwTo: "2B" },
  },
  {
    id: "runner-first-third-hit",
    name: "Grounder to third",
    coachBefore: "Grounder to third. Field it and take the force at second if the bag is occupied.",
    coachCorrect: "Force at second from third. That's the right base.",
    coachPartial: "Someone needed to be at second to take that throw.",
    coachWrong: "Don't chase the batter to first when second is a force.",
    hit: {
      kind: "grounder",
      target: spot("3B", 5),
      speed: 25,
      launchAngle: 8,
    },
    expected: { fieldedBy: "3B", cover: "2B", throwTo: "2B" },
  },
  {
    id: "third-base-grounder",
    name: "Grounder to third",
    coachBefore: "Grounder to third. Get the ball and make the force at third or turn it if the traffic is there.",
    coachCorrect: "Force at third. Keep throwing if the runners are still alive.",
    coachPartial: "You fielded it. Third is the key bag on this play.",
    coachWrong: "Third base is the play on a grounder that direction.",
    hit: {
      kind: "grounder",
      target: spot("3B", 5),
      speed: 25,
      launchAngle: 8,
    },
    expected: { fieldedBy: "3B", throwTo: "3B" },
  },
  {
    id: "fly-lcf",
    name: "Pop fly to left-center gap",
    coachBefore: "Pop fly to the left-center gap! Call it and get under it before it drops.",
    coachCorrect: "That’s the catch — call it and take it in the air.",
    coachPartial: "You got under it. This one had to be caught before it hit the ground.",
    coachWrong: "That was a deep fly in the left-center gap — call it early before it falls.",
    hit: {
      kind: "fly",
      target: between("LF", "CF"),
      speed: 58,
      launchAngle: 52,
    },
    expected: { fieldedBy: "CF", catchFly: true },
  },
  {
    id: "fly-rcf",
    name: "Pop fly to right-center gap",
    coachBefore: "Pop fly to the right-center gap! Call it and get under it before it drops.",
    coachCorrect: "That’s the catch — call it and take it in the air.",
    coachPartial: "You got under it. This one had to be caught before it hit the ground.",
    coachWrong: "That was a deep fly in the right-center gap — call it early before it falls.",
    hit: {
      kind: "fly",
      target: between("CF", "RF"),
      speed: 58,
      launchAngle: 52,
    },
    expected: { fieldedBy: "CF", catchFly: true },
  },
  linerToSecond("ld-lf", "Line drive to left", "LF"),
  linerToSecond("ld-cf", "Line drive to center", "CF"),
  linerToSecond("ld-rf", "Line drive to right", "RF"),
];

function linerToSecond(id: string, name: string, fieldedBy: "LF" | "CF" | "RF"): Scenario {
  const field =
    fieldedBy === "LF" ? "left" : fieldedBy === "CF" ? "center" : "right";
  return {
    id,
    name,
    coachBefore: `Line drive to ${field}! Get it and look for second if a runner is going.`,
    coachCorrect: "That's the play — hit the cutoff and get it to second.",
    coachPartial: "You got the ball. The runner was going — second is where the throw belongs.",
    coachWrong: "Line drive to the outfield: second is usually the right throw if a runner is threatening.",
    hit: {
      kind: "liner",
      target: spot(fieldedBy, 8),
      speed: 78,
      launchAngle: 16,
    },
    expected: { fieldedBy, cover: "2B", throwTo: "2B" },
  };
}

export function pickRandomScenario(enabled: Set<string>, currentId?: string): Scenario {
  const pool = SCENARIOS.filter((s) => enabled.has(s.id));
  const list = pool.length > 0 ? pool : SCENARIOS;
  const choices = list.filter((s) => s.id !== currentId);
  const pick = choices[Math.floor(Math.random() * choices.length)] ?? list[0]!;
  return pick;
}

export function defaultEnabledIds(): Set<string> {
  return new Set(SCENARIOS.map((s) => s.id));
}
