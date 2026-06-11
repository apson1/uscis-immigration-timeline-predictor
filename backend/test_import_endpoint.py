import httpx
import json

def test_import():
    url = "http://127.0.0.1:8000/api/cases/import-detailed"
    
    payload = {
      "data": {
        "receiptNumber": "IOE485TESTCASE",
        "submissionDate": "2026-02-13",
        "submissionTimestamp": "2026-02-13T00:00:00.000Z",
        "formType": "I-485",
        "formName": "Application to Register Permanent Residence or Adjust Status",
        "updatedAt": "2026-05-28",
        "updatedAtTimestamp": "2026-05-28T15:16:39.349Z",
        "cmsFailure": False,
        "closed": False,
        "ackedByAdjudicatorAndCms": True,
        "applicantName": "XXXXXXXXXXXXXXXXXXXX",
        "nonElisPaperFiled": False,
        "noticeMailingPrefIndicator": False,
        "docMailingPrefIndicator": False,
        "elisBeneficiaryAddendum": {},
        "areAllGroupStatusesComplete": False,
        "areAllGroupMembersAuthorizedForTravel": True,
        "isPremiumProcessed": False,
        "actionRequired": False,
        "elisChannelType": "Lockbox",
        "concurrentCases": [],
        "documents": [],
        "evidenceRequests": [
          {
            "noticeId": "424407149",
            "receiptNumber": "IOE485TESTCASE",
            "createdAt": "2026-03-05",
            "documentUri": "Hg1fS_EgCJZLRRmEqmRD_COJFdgUUpxLJxythyLwaDM",
            "expirationDate": "2026-05-19T03:59:59.000Z",
            "generationDate": "2026-02-20T05:00:00.000Z",
            "responseCount": 1,
            "latestResponseDate": "2026-03-05T12:37:03.819Z",
            "finalized": False,
            "isExpired": True,
            "isRespondedTo": False,
            "cmsContentId": "Hg1fS_EgCJZLRRmEqmRD_COJFdgUUpxLJxythyLwaDM",
            "actionType": "Request for Evidence"
          }
        ],
        "notices": [
          {
            "receiptNumber": "IOE485TESTCASE",
            "letterId": "425590818",
            "generationDate": "2026-02-28T00:54:06.213Z",
            "appointmentDateTime": "2026-03-20T13:00:00.000Z",
            "actionType": "Appointment Scheduled"
          }
        ],
        "events": [
          {
            "receiptNumber": "IOE485TESTCASE",
            "eventId": "fde5541c-5542-418c-8706-b2daa3e96aff",
            "eventCode": "FTA0",
            "createdAt": "2026-05-20",
            "createdAtTimestamp": "2026-05-20T10:47:39.007Z",
            "updatedAt": "2026-05-20",
            "updatedAtTimestamp": "2026-05-20T10:47:39.007Z",
            "eventDateTime": "2026-05-20",
            "eventTimestamp": "2026-05-20T10:47:33.574Z"
          },
          {
            "receiptNumber": "IOE485TESTCASE",
            "eventId": "db4c391e-9c79-41e7-b023-b3ebc6285188",
            "eventCode": "FTA0",
            "createdAt": "2026-03-20",
            "createdAtTimestamp": "2026-03-20T13:30:23.215Z",
            "updatedAt": "2026-03-20",
            "updatedAtTimestamp": "2026-03-20T13:30:23.215Z",
            "eventDateTime": "2026-03-20",
            "eventTimestamp": "2026-03-20T13:30:23.038Z"
          },
          {
            "receiptNumber": "IOE485TESTCASE",
            "eventId": "8f773434-3660-4243-a82d-15f2a11c03b4",
            "eventCode": "FTA0",
            "createdAt": "2026-03-20",
            "createdAtTimestamp": "2026-03-20T13:30:23.211Z",
            "updatedAt": "2026-03-20",
            "updatedAtTimestamp": "2026-03-20T13:30:23.211Z",
            "eventDateTime": "2026-03-20",
            "eventTimestamp": "2026-03-20T13:30:23.038Z"
          },
          {
            "receiptNumber": "IOE485TESTCASE",
            "eventId": "9cbc080c-b5ca-4718-82ed-b38be2b9002c",
            "eventCode": "FTA0",
            "createdAt": "2026-03-20",
            "createdAtTimestamp": "2026-03-20T13:30:22.165Z",
            "updatedAt": "2026-03-20",
            "updatedAtTimestamp": "2026-03-20T13:30:22.165Z",
            "eventDateTime": "2026-03-20",
            "eventTimestamp": "2026-03-20T13:30:21.860Z"
          },
          {
            "receiptNumber": "IOE485TESTCASE",
            "eventId": "fe8dbd4b-9f8a-4f74-bdc8-b352eddb1890",
            "eventCode": "FTA0",
            "createdAt": "2026-03-20",
            "createdAtTimestamp": "2026-03-20T13:14:48.818Z",
            "updatedAt": "2026-03-20",
            "updatedAtTimestamp": "2026-03-20T13:14:48.818Z",
            "eventDateTime": "2026-03-20",
            "eventTimestamp": "2026-03-20T13:14:45.151Z"
          },
          {
            "receiptNumber": "IOE485TESTCASE",
            "eventId": "4c6f3e1a-9715-4614-a8dd-e38475204034",
            "eventCode": "HA",
            "createdAt": "2026-03-05",
            "createdAtTimestamp": "2026-03-05T02:09:10.642Z",
            "updatedAt": "2026-03-05",
            "updatedAtTimestamp": "2026-03-05T02:09:10.642Z",
            "eventDateTime": "2026-03-05",
            "eventTimestamp": "2026-03-05T02:09:10.064Z"
          },
          {
            "receiptNumber": "IOE485TESTCASE",
            "eventId": "622eeea9-a09b-45d6-a25a-e344142460cf",
            "eventCode": "IKA",
            "createdAt": "2026-02-25",
            "createdAtTimestamp": "2026-02-25T18:38:55.918Z",
            "updatedAt": "2026-02-25",
            "updatedAtTimestamp": "2026-02-25T18:38:55.918Z",
            "eventDateTime": "2026-02-20",
            "eventTimestamp": "2026-02-20T12:13:52.000Z"
          }
        ],
        "addendums": []
      }
    }

    req_body = {
        "user_id": "dev_user_1",
        "service_center": "National Benefits Center",
        "payload": payload
    }

    print("Sending request to backend detailed import API...")
    res = httpx.post(url, json=req_body)
    print("Status code:", res.status_code)
    try:
        data = res.json()
        print("Response:", json.dumps(data, indent=2))
    except Exception as e:
        print("Response parsing failed:", res.text)

if __name__ == "__main__":
    test_import()
