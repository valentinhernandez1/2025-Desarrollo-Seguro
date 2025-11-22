// test/services/templateInjection.test.ts

// ✅ Mockeamos utils/jwt para que NO pida JWT_SECRET
jest.mock("../../src/utils/jwt", () => ({
  __esModule: true,
  // ajustá el nombre si en tu código se llama distinto
  generateJwt: jest.fn().mockReturnValue("fake-token"),
}));

import AuthService from "../../src/services/authService";
import db from "../../src/db";
import nodemailer from "nodemailer";

jest.mock("../../src/db");

jest.mock("nodemailer");
const mockedMailer = nodemailer as unknown as jest.Mocked<typeof nodemailer>;
mockedMailer.createTransport.mockReturnValue({
  sendMail: jest.fn().mockResolvedValue(true),
} as any);

describe("Template Injection mitigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should escape malicious template payloads and prevent EJS execution", async () => {
    const payload = "<%= process.exit() %>";

    (db as any).mockReturnValue({
      where: () => ({
        orWhere: () => ({
          first: () => null,
        }),
      }),
      insert: jest.fn().mockResolvedValue(true),
    });

    await AuthService.createUser({
      username: "testUser",
      password: "123",
      email: "test@mail.com",
      first_name: payload,
      last_name: payload,
    });

    const call =
      mockedMailer.createTransport().sendMail as jest.MockedFunction<any>;
    expect(call).toHaveBeenCalled();

    const html = call.mock.calls[0][0].html;

    // ✅ Validaciones de mitigación
    expect(html).toContain("&amp;lt;%="); // escapado
    expect(html).not.toContain("<%=");    // no ejecuta EJS
  });
});
