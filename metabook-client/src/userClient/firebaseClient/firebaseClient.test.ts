import firebase from "firebase/app";
import * as firebaseTesting from "@firebase/testing";
import { PromptID } from "metabook-core";
import { promiseForNextCall } from "../../util/tests/promiseForNextCall";
import { recordTestPromptStateUpdate } from "../../util/tests/recordTestPromptStateUpdate";
import { MetabookLocalUserClient } from "../localClient";
import { MetabookFirebaseUserClient } from "./firebaseClient";

let testApp: firebase.app.App;
let client: MetabookFirebaseUserClient;

const testUserID = "testUser";
const testProjectID = "firebase-client-test";
beforeEach(() => {
  testApp = firebaseTesting.initializeTestApp({
    projectId: testProjectID,
    auth: { uid: testUserID, email: "test@test.com" },
  });
  client = new MetabookFirebaseUserClient(testApp, testUserID);
});

afterEach(() => {
  return firebaseTesting.clearFirestoreData({ projectId: testProjectID });
});

test("recording a marking triggers card state update", async () => {
  const mockFunction = jest.fn();
  const firstMockCall = promiseForNextCall(mockFunction);
  const unsubscribe = client.subscribeToPromptStates(
    {},
    mockFunction,
    (error) => {
      fail(error);
    },
  );
  await firstMockCall;
  const initialPromptStates = mockFunction.mock.calls[0][0];
  expect(initialPromptStates).toMatchObject(new Map());

  const secondMockCall = promiseForNextCall(mockFunction);
  jest.spyOn(Math, "random").mockReturnValue(0.25);
  const { newPromptState, testPromptID } = recordTestPromptStateUpdate(client);
  expect(newPromptState).toMatchInlineSnapshot(`
    Object {
      "bestInterval": 0,
      "dueTimestampMillis": 432001000,
      "interval": 432000000,
      "needsRetry": false,
      "taskParameters": null,
    }
  `);

  const updatedPromptStates = await secondMockCall;
  expect(updatedPromptStates).toMatchObject(
    new Map([[testPromptID, newPromptState]]),
  );

  // The new prompt states should be a different object.
  expect(updatedPromptStates).not.toMatchObject(initialPromptStates);

  unsubscribe();
});

test("port logs from local client", async () => {
  const localClient = new MetabookLocalUserClient();
  recordTestPromptStateUpdate(localClient);
  const { newPromptState, commit, testPromptID } = recordTestPromptStateUpdate(
    localClient,
  );
  await commit;

  await client.recordActionLogs(localClient.getAllLogs());
  const cardStates = await client.getPromptStates({});
  expect(cardStates.get(testPromptID as PromptID)).toMatchObject(
    newPromptState,
  );
});

test("getCardStates changes after recording update", async () => {
  const initialCardStates = await client.getPromptStates({});
  await recordTestPromptStateUpdate(client).commit;
  const finalCardStates = await client.getPromptStates({});
  expect(initialCardStates).not.toMatchObject(finalCardStates);
});

test("no events after unsubscribing", async () => {
  const mockFunction = jest.fn();
  const firstMockCall = promiseForNextCall(mockFunction);
  const unsubscribe = client.subscribeToPromptStates(
    {},
    mockFunction,
    jest.fn(),
  );
  await firstMockCall;
  mockFunction.mockClear();

  unsubscribe();

  await recordTestPromptStateUpdate(client).commit;
  expect(mockFunction).not.toHaveBeenCalled();
});

describe("security rules", () => {
  let anotherClient: MetabookFirebaseUserClient;
  beforeEach(() => {
    anotherClient = new MetabookFirebaseUserClient(testApp, "anotherUser");
  });

  test("can't read cards from another user", async () => {
    await recordTestPromptStateUpdate(client).commit;
    await expect(anotherClient.getPromptStates({})).rejects.toBeInstanceOf(
      Error,
    );
  });

  test("can't write cards to another user", async () => {
    await expect(
      recordTestPromptStateUpdate(anotherClient).commit,
    ).rejects.toBeInstanceOf(Error);
  });
});