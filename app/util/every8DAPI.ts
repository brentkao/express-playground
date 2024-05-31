import axios, { AxiosInstance } from "axios";

declare namespace Every8dApi {
  type Config = {
    UID: string;
    PWD: string;
    isLog: boolean;
    isDebug: boolean;
  };
  type ConnectionResult = {
    Result: boolean;
    Msg?: string;
  };
  type SendSMSResult =
    | {
        Status: string;
        Msg: string;
      }
    | string;

  /**
   * CREDIT(剩餘點數), SENDED(發送通數), COST(發送扣除點數), UNSEND(無額度時發送的通數), BATCHID(批次編號)
   */
  type SendSMSSuccess = [
    credit: number,
    sended: number,
    cost: number,
    unsend: number,
    batchId: string
  ];

  /** 簡訊發送格式 */
  type SendSMS = {
    /** 簡訊主旨 */
    SB?: string;
    /** 簡訊內容 */
    MSG: string;
    /** 收訊人手機號碼;多組號碼以半形逗點隔開 */
    DEST: string[];
    /** 預約時間;格式為 yyyyMMddHHmmss。 立即發送:請傳入空字串。 */
    ST?: string;
    /** 有效期限;預設為 1440，單位:分鐘。 */
    RETRYTIME?: number;
    /** 活動代碼;可不填 */
    EventID?: string;
  };

  type InputError = {
    msg: string;
    detail: { [key in string]: any };
  }[];

  type Response = [success: boolean, error?: InputError];
}

//=> 這裡是 Every8d API 的實作
export default class Every8dApi {
  private _authKey: string = "";
  private _siteUrl: string = ""; // https://${siteUrl}/API21/HTTP   //api.e8d.tw
  private _config: Every8dApi.Config = {
    UID: "",
    PWD: "",
    isLog: false,
    isDebug: false,
  };
  private _axiosInstance: AxiosInstance;

  //=> 建構子
  constructor({
    siteUrl = "api.e8d.tw",
    config,
    timeout = 3000,
  }: {
    siteUrl: string;
    config: Every8dApi.Config;
    timeout?: number;
  }) {
    this._siteUrl = `https://${siteUrl}/API21/HTTP`;
    this._config = config;

    //=> 初始化 axios API
    this._axiosInstance = axios.create({
      baseURL: this._siteUrl,
      timeout,
    });
  }

  /** 字串紀錄 */
  private logString(msg: string): void {
    if (this._config.isLog || this._config.isDebug)
      console.log(`[Every8dApi] ${msg}`);
  }
  /** data紀錄 */
  private logData(msg: string, data: object): void {
    if (this._config.isLog || this._config.isDebug)
      console.log(`[Every8dApi](data) ${msg}:\n`, data);
  }
  /** data紀錄 */
  private logError(msg: string, data: object): void {
    if (this._config.isLog || this._config.isDebug)
      console.log(`[Every8dApi](error) ${msg}:\n`, data);
  }

  //=> 初始化
  async init(): Promise<void> {
    this.logString(" 🚀 | 開始 初始化 Every8dApi...");
    if (this._siteUrl === "") throw new Error("API URL is empty.");
    if (typeof this._config !== "object") throw new Error("Config is empty.");
    if (this._config.UID === "") throw new Error("Config.UID is empty.");
    if (this._config.PWD === "") throw new Error("Config.PWD is empty.");

    //=> 初次 取得連線憑證
    await this.getConnection();
    //=> 設定 重新連線(5小時後重新取得憑證)
    setInterval(async () => {
      await this.reConnection();
    }, 1000 * 60 * 60 * 5); // 5小時
    this.logString(" ✅ | 初始化完成");
  }

  //=> 取得連線憑證
  // POST | application/application/json | ConnectionHandler.ashx | { "HandlerType":3, "VerifyType": 1, "UID": "___", "PWD": "___"}
  async getConnection(): Promise<Every8dApi.Response> {
    this.logString("取得連線憑證...");
    try {
      const res = await this._axiosInstance.post<Every8dApi.ConnectionResult>(
        "/ConnectionHandler.ashx",
        {
          HandlerType: 3,
          VerifyType: 1,
          UID: this._config.UID,
          PWD: this._config.PWD,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (res.data.Result && res.data.Msg) {
        this._authKey = res.data.Msg;
        //=> 設定 Authorization
        this._axiosInstance.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${this._authKey}`;
        this.logString("儲存authKey");
        return [true];
      } else {
        throw new Error(`取得連線憑證失敗 Msg: ${res.data.Msg}`);
      }
    } catch (error: any) {
      this.logError("取得連線憑證失敗", error);
      return [false, [{ msg: error.message, detail: error.response?.data }]];
    }
  }
  //=> 檢查連線狀態
  // POST | application/application/json | ConnectionHandler.ashx | Authorization:Bearer ___ | { "HandlerType":3, "VerifyType": 2 }
  async checkConnectionStatus(): Promise<Every8dApi.Response> {
    this.logString("檢查連線狀態...");
    try {
      const res = await this._axiosInstance.post<Every8dApi.ConnectionResult>(
        "/ConnectionHandler.ashx",
        {
          HandlerType: 3,
          VerifyType: 2,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      this.logData("res", res.data);
      if (res.data.Result) {
        this.logString("authKey 連線正常: " + res.data.Result);
        return [true];
      } else {
        throw new Error(`檢查連線狀態失敗 Msg: ${res.data?.Msg}`);
      }
    } catch (error: any) {
      this.logError("檢查連線狀態失敗", error);
      return [false, [{ msg: error.message, detail: error.response?.data }]];
    }
  }
  //=> 關閉連線憑證
  // POST | application/application/json | ConnectionHandler.ashx | Authorization:Bearer ___ | { "HandlerType":3, "VerifyType": 3 }
  async closeConnection(): Promise<Every8dApi.Response> {
    this.logString("關閉連線憑證...");
    try {
      const res = await this._axiosInstance.post<Every8dApi.ConnectionResult>(
        "/ConnectionHandler.ashx",
        {
          HandlerType: 3,
          VerifyType: 3,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (res.data.Result) {
        this.logString("關閉連線憑證成功: " + res.data.Result);
        return [true];
      } else {
        throw new Error(`關閉連線憑證失敗 Msg: ${res.data?.Msg}`);
      }
    } catch (error: any) {
      this.logError("關閉連線憑證失敗", error);
      return [false, [{ msg: error.message, detail: error.response?.data }]];
    }
  }

  //=> 重新連線(5小時後重新取得憑證)
  async reConnection(): Promise<void> {
    this.logString("開始重新連線...");
    await this.closeConnection();
    await this.getConnection();
    this.logString("重新連線完成。");
  }

  //=> 發送 「一般簡訊」(SendSMS)
  /**
   * 發送 「一般簡訊」(SendSMS)
   *
   * POST | application/x-www-form-urlencoded | SendSMS.ashx
   * */
  async sendSMS(
    data: Every8dApi.SendSMS,
    phoneRegex: RegExp = /^[0-9]+$/
  ): Promise<Every8dApi.Response> {
    const { SB = "", MSG, DEST, ST = "", RETRYTIME = 1440, EventID } = data;
    //=> 檢查參數
    const inputError: Every8dApi.InputError = [];
    if (typeof SB !== "string")
      inputError.push({
        msg: "SB is not string.",
        detail: { SB },
      });
    if (MSG === "" || typeof MSG !== "string")
      inputError.push({
        msg: "MSG is empty or not string.",
        detail: { MSG },
      });
    if (DEST.some((phone) => !phoneRegex.test(phone)))
      inputError.push({
        msg: "DEST phone number is not invalid.",
        detail: { DEST },
      });
    //TODO: 檢查時間格式 (yyyyMMddHHmmss)
    if (typeof ST !== "string")
      inputError.push({
        msg: "ST is not string.",
        detail: { ST },
      });
    if (typeof RETRYTIME !== "number")
      inputError.push({
        msg: "RETRYTIME is not number.",
        detail: { RETRYTIME },
      });
    if (EventID && typeof EventID !== "string")
      inputError.push({
        msg: "EventID is not string.",
        detail: { EventID },
      });

    if (inputError.length > 0) return [false, inputError];
    this.logString("開始發送簡訊...");
    let response: Every8dApi.Response = [false];
    try {
      const res = await this._axiosInstance.post<Every8dApi.SendSMSResult>(
        "/SendSMS.ashx",
        {
          SB,
          MSG,
          DEST: DEST.join(","),
          ST,
          RETRYTIME,
          EventID,
        },
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
      this.logData("res", { data: res.data });
      switch (typeof res.data) {
        case "string":
          const [CREDIT, SENDED, COST, UNSEND, BATCHID] = res.data.split(
            ","
          ) as Every8dApi.SendSMSSuccess;
          if (!CREDIT || !SENDED || !COST || !UNSEND || !BATCHID)
            throw new Error(`發送簡訊失敗 Msg: ${res.data}`);
          this.logString("發送簡訊成功: " + res.data);
          this.logData("成功參數", { CREDIT, SENDED, COST, UNSEND, BATCHID });
          response = [true];
          break;
        case "object":
          this.logData("失敗參數", res.data);
          throw new Error(`發送簡訊失敗 Msg: ${res.data?.Msg}`);
      }
    } catch (error: any) {
      this.logError("發送簡訊失敗", error);
      response = [
        false,
        [{ msg: error.message, detail: error.response?.data }],
      ];
    }
    return response;
  }
}
