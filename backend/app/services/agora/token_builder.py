import time

class Role:
    PUBLISHER = 1
    SUBSCRIBER = 2

class RtcTokenBuilder:
    @staticmethod
    def build_token_with_uid(
        app_id: str,
        app_certificate: str,
        channel_name: str,
        uid: int,
        role: int = Role.PUBLISHER,
        privilege_expire_ts: int = 0
    ) -> str:
        """
        Build Agora RTC Token with integer UID using official agora-token-builder.
        """
        if not app_id or not app_certificate:
            return ""

        if privilege_expire_ts == 0:
            privilege_expire_ts = int(time.time()) + 86400

        try:
            from agora_token_builder import RtcTokenBuilder as OfficialBuilder
            return OfficialBuilder.buildTokenWithUid(
                app_id,
                app_certificate,
                channel_name,
                uid,
                role,
                privilege_expire_ts
            )
        except Exception as e:
            print(f"[AgoraTokenBuilder Error] Failed to generate token: {e}")
            return ""
