module.exports = {
  printToFileAsync: jest.fn().mockResolvedValue({
    uri: 'file:///mock/documents/SAS_Attendance.pdf',
    numberOfPages: 1,
  }),
  printAsync: jest.fn().mockResolvedValue(undefined),
};
