import protobuf from 'protobufjs';

// Wire-compatible subset of rv.data. Unknown fields are deliberately ignored.
// Field definitions adapted from greyshirtguy/ProPresenter7-Proto (MIT).
// See docs/propresenter.md and the accompanying third-party license.
export const presentationType = protobuf.parse(`syntax = "proto3";
message UUID { string string = 1; }
message Color { float red = 1; float green = 2; float blue = 3; float alpha = 4; }
message Size { double width = 1; double height = 2; }
message Point { double x = 1; double y = 2; }
message Rect { Point origin = 1; Size size = 2; }
message Shape { uint32 type = 1; }
message BezierPoint { Point point = 1; Point q0 = 2; Point q1 = 3; bool curved = 4; }
message Path { bool closed = 1; repeated BezierPoint points = 2; Shape shape = 3; }
message Fill { Color color = 1; bool enable = 4; }
message Stroke { uint32 style = 1; double width = 2; Color color = 3; bool enable = 5; }
message Shadow { uint32 style = 1; double angle = 2; double offset = 3; double radius = 4; Color color = 5; double opacity = 6; bool enable = 7; }
message Feather { uint32 style = 1; double radius = 2; bool enable = 3; }
message EdgeInsets { double left = 1; double right = 2; double top = 3; double bottom = 4; }
message Version { uint32 major_version = 1; uint32 minor_version = 2; uint32 patch_version = 3; string build = 4; }
message ApplicationInfo { uint32 platform = 1; Version platform_version = 2; uint32 application = 3; Version application_version = 4; }
message Font { string name = 1; double size = 2; bool italic = 4; bool bold = 8; string family = 9; string face = 10; }
message Paragraph { uint32 alignment = 1; double line_height_multiple = 5; }
message Attributes { Font font = 1; Color text_solid_fill = 3; Paragraph paragraph_style = 6; }
message Text { Attributes attributes = 3; Shadow shadow = 4; bytes rtf_data = 5; uint32 vertical_alignment = 6; uint32 scale_behavior = 7; EdgeInsets margins = 8; }
message Element { UUID uuid = 1; string name = 2; Rect bounds = 3; double opacity = 5; Path path = 8; Fill fill = 9; Stroke stroke = 10; Shadow shadow = 11; Feather feather = 12; Text text = 13; bool hidden = 16; }
message SlideElement { Element element = 1; }
message Slide { repeated SlideElement elements = 1; repeated UUID element_build_order = 2; bool draws_background_color = 4; Color background_color = 5; Size size = 6; UUID uuid = 7; }
message PresentationSlide { Slide base_slide = 1; }
message SlideType { PresentationSlide presentation = 2; }
message Action { UUID uuid = 1; string name = 2; bool isEnabled = 6; uint32 type = 9; SlideType slide = 23; }
message Cue { UUID uuid = 1; string name = 2; repeated Action actions = 10; bool isEnabled = 12; }
message Group { UUID uuid = 1; string name = 2; Color color = 3; UUID application_group_identifier = 5; string application_group_name = 6; }
message CueGroup { Group group = 1; repeated UUID cue_identifiers = 2; }
message Arrangement { UUID uuid = 1; string name = 2; repeated UUID group_identifiers = 3; }
message CCLI { string author = 1; string artist_credits = 2; string song_title = 3; }
message Presentation { ApplicationInfo application_info = 1; UUID uuid = 2; string name = 3; UUID selected_arrangement = 10; repeated Arrangement arrangements = 11; repeated CueGroup cue_groups = 12; repeated Cue cues = 13; CCLI ccli = 14; string music_key = 22; }
`).root.lookupType('Presentation');
