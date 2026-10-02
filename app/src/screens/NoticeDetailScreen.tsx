/**
 * 공지 상세 — DESIGN-CANVAS 기준, NOTICE_DETAIL.dc.html
 * 본문은 빈 줄로 문단을 나누고 "- " 줄은 목록으로 표시, 정보표(info)는 첫 문단 다음에 표시(디자인 배치와 동일).
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Share, Image } from 'react-native';
import { SERVER_BASE_URL } from '../api/axiosInstance';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../components/AppHeader';
import { getNotice } from '../api/noticesApi';
import type { NoticeDetail } from '../api/noticesApi';
import { formatNoticeDate, parseNoticeBody, splitInline } from '../utils/notice';
import type { BodyBlock } from '../utils/notice';
import { colors, radius, spacing } from '../theme/designTokens';

// ★ v18.41 — 웹 관리자에서 넣은 글자 꾸밈(**굵게** *기울임* __밑줄__) 표시
function RichText({ text, style }: { text: string; style: any }) {
  return (
    <Text style={style}>
      {splitInline(text).map((p, k) => (
        <Text
          key={k}
          style={[p.bold && { fontWeight: '700' }, p.italic && { fontStyle: 'italic' }, p.underline && { textDecorationLine: 'underline' }]}
        >
          {p.text}
        </Text>
      ))}
    </Text>
  );
}

export function NoticeBody({ blocks }: { blocks: BodyBlock[] }) {
  return (
    <>
      {blocks.map((b, i) =>
        b.kind === 'p' ? (
          <RichText key={i} text={b.text} style={bodyStyles.paragraph} />
        ) : (
          <View key={i} style={{ gap: 4 }}>
            {b.items.map((item, j) => (
              <View key={j} style={bodyStyles.bulletRow}>
                <Text style={bodyStyles.bullet}>{b.kind === 'ol' ? `${j + 1}.` : '•'}</Text>
                <RichText text={item} style={[bodyStyles.paragraph, { flex: 1 }]} />
              </View>
            ))}
          </View>
        ),
      )}
    </>
  );
}

export default function NoticeDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id: number = route.params.id;
  const [notice, setNotice] = useState<NoticeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setFailed(false);
      getNotice(id)
        .then(setNotice)
        .catch(() => setFailed(true))
        .finally(() => setLoading(false));
    }, [id]),
  );

  const handleShare = () => {
    if (!notice) return;
    Share.share({ message: `[WorkMate 공지] ${notice.title}\n\n${notice.body ?? ''}` }).catch(() => {});
  };

  const shareButton = (
    <Pressable onPress={handleShare} style={styles.headerBtn} hitSlop={6} disabled={!notice}>
      <Icon name="share-variant-outline" size={22} color={colors.textPrimary} />
    </Pressable>
  );

  if (loading || !notice) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="back" title="공지사항" rightContent={shareButton} />
        <View style={styles.centerBox}>
          {failed ? <Text style={styles.emptyText}>공지를 불러오지 못했어요.</Text> : <ActivityIndicator color={colors.primary} />}
        </View>
      </View>
    );
  }

  const blocks = parseNoticeBody(notice.body);
  const [firstBlock, ...restBlocks] = blocks;

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="공지사항" rightContent={shareButton} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headBlock}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: '#E8F3FF' }]}>
              <Text style={[styles.badgeText, { color: colors.primaryDark }]}>공지</Text>
            </View>
            {notice.is_pinned && (
              <View style={[styles.badge, { backgroundColor: '#FFF2E2' }]}>
                <Text style={[styles.badgeText, { color: '#B95E00' }]}>중요</Text>
              </View>
            )}
          </View>
          <Text style={styles.title}>{notice.title}</Text>
          <Text style={styles.meta}>{notice.author} · {formatNoticeDate(notice.published_at)}</Text>
        </View>

        {/* ★ v18.41 — 웹 관리자에서 올린 첨부 이미지 */}
        {!!notice.banner_path && (
          <Image source={{ uri: `${SERVER_BASE_URL}/storage/${notice.banner_path}` }} style={styles.attachImage} resizeMode="contain" />
        )}

        {firstBlock && <NoticeBody blocks={[firstBlock]} />}

        {!!notice.info?.length && (
          <View style={styles.infoCard}>
            {notice.info.map((row, i) => (
              <View key={i} style={[styles.infoRow, i === notice.info!.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        )}

        <NoticeBody blocks={restBlocks} />

        <View style={styles.navCard}>
          <Pressable
            style={styles.navRow}
            disabled={!notice.prev}
            onPress={() => notice.prev && navigation.replace('NoticeDetail', { id: notice.prev.id })}
          >
            <Text style={styles.navLabel}>이전 글</Text>
            <Text style={[styles.navTitle, !notice.prev && styles.navEmpty]} numberOfLines={1}>{notice.prev?.title ?? '이전 글이 없습니다'}</Text>
          </Pressable>
          <Pressable
            style={[styles.navRow, { borderBottomWidth: 0 }]}
            disabled={!notice.next}
            onPress={() => notice.next && navigation.replace('NoticeDetail', { id: notice.next.id })}
          >
            <Text style={styles.navLabel}>다음 글</Text>
            <Text style={[styles.navTitle, !notice.next && styles.navEmpty]} numberOfLines={1}>{notice.next?.title ?? '다음 글이 없습니다'}</Text>
          </Pressable>
        </View>

        <Pressable style={styles.listBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.listBtnText}>목록으로</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const bodyStyles = StyleSheet.create({
  paragraph: { fontSize: 14, lineHeight: 24, color: colors.textPrimary },
  bulletRow: { flexDirection: 'row', gap: 8 },
  bullet: { fontSize: 14, lineHeight: 24, color: colors.textPrimary },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: colors.textSecondary },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingTop: spacing.xs, paddingBottom: spacing.xl, gap: 16 },

  headBlock: { gap: 8, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  badgeRow: { flexDirection: 'row', gap: 6 },
  badge: { height: 24, paddingHorizontal: 9, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  title: { fontSize: 19, fontWeight: '800', color: colors.textPrimary, lineHeight: 27 },
  meta: { fontSize: 12, color: colors.textSecondary },
  attachImage: { width: '100%', aspectRatio: 1.6, borderRadius: radius.md, backgroundColor: colors.background },

  infoCard: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 4 },
  infoRow: { flexDirection: 'row', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  infoLabel: { width: 70, fontSize: 13, color: colors.textSecondary },
  infoValue: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.textPrimary },

  navCard: { borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, paddingHorizontal: 16 },
  navRow: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  navLabel: { width: 44, fontSize: 12, color: colors.textSecondary },
  navTitle: { flex: 1, fontSize: 13, color: colors.textPrimary },
  navEmpty: { color: colors.muted },

  listBtn: { height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: '#BFDBFB', alignItems: 'center', justifyContent: 'center' },
  listBtnText: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
});
