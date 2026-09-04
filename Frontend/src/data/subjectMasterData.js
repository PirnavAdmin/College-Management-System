export const subjectMaster = [
  { id: "ENG1", name: "English", code: "ENG1", type: ["Language"], marks: { theory: 100, practical: 0, internal: 0, total: 100, passing: 35 } },
  { id: "SL1", name: "Second Language", code: "SL1", type: ["Language"], marks: { theory: 100, practical: 0, internal: 0, total: 100, passing: 35 } },
  { id: "MATH1A", name: "Mathematics IA", code: "MATH1A", type: ["Theory"], marks: { theory: 75, practical: 0, internal: 0, total: 75, passing: 27 } },
  { id: "MATH1B", name: "Mathematics IB", code: "MATH1B", type: ["Theory"], marks: { theory: 75, practical: 0, internal: 0, total: 75, passing: 27 } },
  { id: "PHY1", name: "Physics", code: "PHY1", type: ["Theory", "Practical"], marks: { theory: 60, practical: 30, internal: 10, total: 100, passing: 35 } },
  { id: "CHE1", name: "Chemistry", code: "CHE1", type: ["Theory", "Practical"], marks: { theory: 60, practical: 30, internal: 10, total: 100, passing: 35 } },
  { id: "BOT1", name: "Botany", code: "BOT1", type: ["Theory", "Practical"], marks: { theory: 60, practical: 30, internal: 10, total: 100, passing: 35 } },
  { id: "ZOO1", name: "Zoology", code: "ZOO1", type: ["Theory", "Practical"], marks: { theory: 60, practical: 30, internal: 10, total: 100, passing: 35 } },
  { id: "ECO1", name: "Economics", code: "ECO1", type: ["Theory"], marks: { theory: 100, practical: 0, internal: 0, total: 100, passing: 35 } },
  { id: "COM1", name: "Commerce", code: "COM1", type: ["Theory"], marks: { theory: 100, practical: 0, internal: 0, total: 100, passing: 35 } },
  { id: "CIV1", name: "Civics", code: "CIV1", type: ["Theory"], marks: { theory: 100, practical: 0, internal: 0, total: 100, passing: 35 } },
  { id: "HIS1", name: "History", code: "HIS1", type: ["Theory"], marks: { theory: 100, practical: 0, internal: 0, total: 100, passing: 35 } },
  { id: "CS1", name: "Computer Science", code: "CS1", type: ["Theory", "Practical"], marks: { theory: 70, practical: 30, internal: 0, total: 100, passing: 35 } },
  { id: "EVS1", name: "Environmental Education", code: "EVS1", type: ["Theory"], marks: { theory: 50, practical: 0, internal: 0, total: 50, passing: 18 } },
];

export const groupSubjectMap = {
  MPC: ["ENG1", "SL1", "MATH1A", "MATH1B", "PHY1", "CHE1"],
  BiPC: ["ENG1", "SL1", "BOT1", "ZOO1", "PHY1", "CHE1"],
  MEC: ["ENG1", "SL1", "MATH1A", "MATH1B", "ECO1", "COM1"],
  CEC: ["ENG1", "SL1", "CIV1", "ECO1", "COM1"],
  HEC: ["ENG1", "SL1", "HIS1", "ECO1", "CIV1"],
};
